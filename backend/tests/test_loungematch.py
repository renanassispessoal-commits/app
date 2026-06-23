"""LoungeMatch end-to-end backend tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://room-match-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def state():
    return {}


# ---------- Health ----------
def test_health(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- Auth ----------
def test_host_login(session, state):
    r = session.post(f"{API}/auth/host/login", json={"email": "admin@demo.com", "password": "password123"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and data["host"]["email"] == "admin@demo.com"
    state["token"] = data["access_token"]
    state["auth"] = {"Authorization": f"Bearer {data['access_token']}"}


def test_host_login_invalid(session):
    r = session.post(f"{API}/auth/host/login", json={"email": "admin@demo.com", "password": "wrong"})
    assert r.status_code == 400


# ---------- Rooms ----------
def test_create_room(session, state):
    r = session.post(f"{API}/rooms", json={"name": "TEST_Room", "description": "test"}, headers=state["auth"])
    assert r.status_code == 200, r.text
    room = r.json()
    assert room["name"] == "TEST_Room"
    assert len(room["code"]) == 6
    assert room["active"] is True
    state["room"] = room


def test_get_room_by_code(session, state):
    r = session.get(f"{API}/rooms/by-code/{state['room']['code']}")
    assert r.status_code == 200
    assert r.json()["id"] == state["room"]["id"]


def test_list_host_rooms(session, state):
    r = session.get(f"{API}/rooms/host", headers=state["auth"])
    assert r.status_code == 200
    assert any(rm["id"] == state["room"]["id"] for rm in r.json())


# ---------- Participants ----------
def test_join_two_participants(session, state):
    code = state["room"]["code"]
    p1 = session.post(f"{API}/participants/join", json={
        "room_code": code, "name": "TEST_Alice", "age": 25, "bio": "hi",
        "interests": ["music"], "photo": "data:image/png;base64,iVBORw0KGgo="
    })
    assert p1.status_code == 200, p1.text
    state["p1"] = p1.json()["participant"]

    p2 = session.post(f"{API}/participants/join", json={
        "room_code": code, "name": "TEST_Bob", "age": 28, "bio": "hi",
        "interests": ["games"], "photo": "data:image/png;base64,iVBORw0KGgo="
    })
    assert p2.status_code == 200
    state["p2"] = p2.json()["participant"]

    assert state["p1"]["room_id"] == state["room"]["id"]


def test_join_invalid_code(session):
    r = session.post(f"{API}/participants/join", json={
        "room_code": "ZZZZZZ", "name": "x", "age": 20, "bio": "", "interests": [], "photo": "x"
    })
    assert r.status_code == 404


# ---------- Deck ----------
def test_deck_excludes_self(session, state):
    r = session.get(f"{API}/rooms/{state['room']['id']}/deck", params={"participant_id": state["p1"]["id"]})
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert state["p1"]["id"] not in ids
    assert state["p2"]["id"] in ids


# ---------- Swipes & Match ----------
def test_swipe_mutual_match(session, state):
    # p1 likes p2 (no match yet)
    r1 = session.post(f"{API}/swipes", json={
        "room_id": state["room"]["id"], "participant_id": state["p1"]["id"],
        "target_id": state["p2"]["id"], "liked": True
    })
    assert r1.status_code == 200
    assert r1.json()["is_match"] is False

    # p2 likes p1 (creates match)
    r2 = session.post(f"{API}/swipes", json={
        "room_id": state["room"]["id"], "participant_id": state["p2"]["id"],
        "target_id": state["p1"]["id"], "liked": True
    })
    assert r2.status_code == 200
    data = r2.json()
    assert data["is_match"] is True
    assert data["match"] is not None
    state["match_id"] = data["match"]["id"]


def test_deck_excludes_swiped(session, state):
    r = session.get(f"{API}/rooms/{state['room']['id']}/deck", params={"participant_id": state["p1"]["id"]})
    ids = [p["id"] for p in r.json()]
    assert state["p2"]["id"] not in ids  # already swiped


def test_list_matches(session, state):
    r = session.get(f"{API}/rooms/{state['room']['id']}/matches", params={"participant_id": state["p1"]["id"]})
    assert r.status_code == 200
    matches = r.json()
    assert len(matches) >= 1
    assert matches[0]["other"]["id"] == state["p2"]["id"]
    assert matches[0]["other"]["name"] == "TEST_Bob"


# ---------- Messages ----------
def test_send_and_list_messages(session, state):
    r = session.post(f"{API}/matches/{state['match_id']}/messages",
                     json={"participant_id": state["p1"]["id"], "text": "hello"})
    assert r.status_code == 200
    assert r.json()["text"] == "hello"

    r2 = session.get(f"{API}/matches/{state['match_id']}/messages")
    assert r2.status_code == 200
    msgs = r2.json()
    assert len(msgs) >= 1
    assert msgs[0]["text"] == "hello"


def test_message_unauthorized(session, state):
    r = session.post(f"{API}/matches/{state['match_id']}/messages",
                     json={"participant_id": "stranger", "text": "x"})
    assert r.status_code == 403


# ---------- Reports ----------
def test_create_and_list_reports(session, state):
    r = session.post(f"{API}/reports", json={
        "room_id": state["room"]["id"], "reporter_id": state["p1"]["id"],
        "reported_id": state["p2"]["id"], "reason": "abuse", "description": "test"
    })
    assert r.status_code == 200
    state["report_id"] = r.json()["id"]

    r2 = session.get(f"{API}/rooms/{state['room']['id']}/reports", headers=state["auth"])
    assert r2.status_code == 200
    reports = r2.json()
    assert len(reports) >= 1
    rep = next(x for x in reports if x["id"] == state["report_id"])
    assert rep["reporter"]["name"] == "TEST_Alice"
    assert rep["reported"]["name"] == "TEST_Bob"


def test_resolve_report(session, state):
    r = session.put(f"{API}/reports/{state['report_id']}/resolve", headers=state["auth"])
    assert r.status_code == 200

    r2 = session.get(f"{API}/rooms/{state['room']['id']}/reports", headers=state["auth"])
    rep = next(x for x in r2.json() if x["id"] == state["report_id"])
    assert rep["status"] == "resolved"


# ---------- Stats ----------
def test_stats(session, state):
    r = session.get(f"{API}/rooms/{state['room']['id']}/stats", headers=state["auth"])
    assert r.status_code == 200
    s = r.json()
    assert s["participants"] == 2
    assert s["swipes"] == 2
    assert s["likes"] == 2
    assert s["matches"] == 1
    assert s["reports_open"] == 0  # resolved


# ---------- Close room ----------
def test_close_room(session, state):
    r = session.post(f"{API}/rooms/{state['room']['id']}/close", headers=state["auth"])
    assert r.status_code == 200

    r2 = session.get(f"{API}/rooms/by-code/{state['room']['code']}")
    assert r2.status_code == 404
