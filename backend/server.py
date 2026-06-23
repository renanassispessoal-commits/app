from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import random
import string
from datetime import datetime, date, timezone, timedelta
from math import radians, sin, cos, asin, sqrt
import jwt
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ['JWT_SECRET_KEY']
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ========== MODELS ==========
class HostRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class HostLogin(BaseModel):
    email: EmailStr
    password: str

class HostPlanUpdate(BaseModel):
    plan: str  # 'daily' | 'monthly' | 'yearly'

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    host: dict

class RoomCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    latitude: float
    longitude: float
    radius_m: Optional[int] = 200

class UserLookup(BaseModel):
    cpf: str

class UserCreate(BaseModel):
    cpf: str
    name: str
    birthdate: str  # YYYY-MM-DD
    bio: Optional[str] = ""
    interests: List[str] = []
    photo: str

class ParticipantCreate(BaseModel):
    room_code: str
    user_id: str
    latitude: float
    longitude: float

class SwipeCreate(BaseModel):
    room_id: str
    participant_id: str
    target_id: str
    liked: bool

class MessageCreate(BaseModel):
    participant_id: str
    text: str

class ReportCreate(BaseModel):
    room_id: str
    reporter_id: str
    reported_id: str
    reason: str
    description: Optional[str] = ""

class ReportMessageCreate(BaseModel):
    text: str
    participant_id: Optional[str] = None  # set when reporter is sending

class ReportActionCreate(BaseModel):
    action: str  # 'timeout_1d' | 'timeout_30d' | 'ban'


# ========== HELPERS ==========
def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_password(pw: str, hashed: str) -> bool:
    return pwd_context.verify(pw, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_host(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        host_id = payload.get("host_id")
        if not host_id or payload.get("role") != "host":
            raise HTTPException(status_code=401, detail="Invalid token")
        host = await db.hosts.find_one({"id": host_id}, {"_id": 0, "password": 0})
        if not host:
            raise HTTPException(status_code=401, detail="Host not found")
        return host
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def gen_room_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    rlat1, rlat2 = radians(lat1), radians(lat2)
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(rlat1) * cos(rlat2) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))

def normalize_cpf(cpf: str) -> str:
    return ''.join(c for c in cpf if c.isdigit())

def valid_cpf(cpf: str) -> bool:
    cpf = normalize_cpf(cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    s = sum(int(cpf[i]) * (10 - i) for i in range(9))
    d1 = (s * 10) % 11
    if d1 == 10:
        d1 = 0
    if d1 != int(cpf[9]):
        return False
    s = sum(int(cpf[i]) * (11 - i) for i in range(10))
    d2 = (s * 10) % 11
    if d2 == 10:
        d2 = 0
    return d2 == int(cpf[10])

def calc_age(birth_iso: str) -> int:
    b = date.fromisoformat(birth_iso)
    today = date.today()
    return today.year - b.year - ((today.month, today.day) < (b.month, b.day))


# ========== AUTH (HOST) ==========
@api_router.post("/auth/host/register", response_model=Token)
async def register_host(data: HostRegister):
    existing = await db.hosts.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    host = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "name": data.name,
        "plan": None,
        "created_at": now_iso(),
    }
    await db.hosts.insert_one(host)
    token = create_access_token({"host_id": host["id"], "role": "host"})
    return Token(
        access_token=token,
        host={"id": host["id"], "email": host["email"], "name": host["name"], "plan": None},
    )


@api_router.post("/auth/host/login", response_model=Token)
async def login_host(data: HostLogin):
    host = await db.hosts.find_one({"email": data.email.lower()})
    if not host or not verify_password(data.password, host["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha incorretos")
    token = create_access_token({"host_id": host["id"], "role": "host"})
    return Token(
        access_token=token,
        host={"id": host["id"], "email": host["email"], "name": host["name"], "plan": host.get("plan")},
    )


@api_router.get("/auth/host/me")
async def get_me(host: dict = Depends(get_current_host)):
    return host


@api_router.put("/auth/host/plan")
async def update_plan(data: HostPlanUpdate, host: dict = Depends(get_current_host)):
    if data.plan not in ("daily", "monthly", "yearly"):
        raise HTTPException(status_code=400, detail="Plano inválido")
    await db.hosts.update_one({"id": host["id"]}, {"$set": {"plan": data.plan, "plan_chosen_at": now_iso()}})
    return {"plan": data.plan}


# ========== USERS (party-goers) ==========
@api_router.post("/users/lookup")
async def lookup_user(data: UserLookup):
    cpf = normalize_cpf(data.cpf)
    if not valid_cpf(cpf):
        raise HTTPException(status_code=400, detail="CPF inválido")
    user = await db.users.find_one({"cpf": cpf}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@api_router.post("/users")
async def create_user(data: UserCreate):
    cpf = normalize_cpf(data.cpf)
    if not valid_cpf(cpf):
        raise HTTPException(status_code=400, detail="CPF inválido")
    try:
        age = calc_age(data.birthdate)
    except Exception:
        raise HTTPException(status_code=400, detail="Data de nascimento inválida")
    if age < 18:
        raise HTTPException(status_code=403, detail=f"Você precisa ter 18 anos ou mais para usar o app (idade atual: {age}).")
    existing = await db.users.find_one({"cpf": cpf})
    if existing:
        raise HTTPException(status_code=400, detail="CPF já cadastrado. Faça login.")
    user = {
        "id": str(uuid.uuid4()),
        "cpf": cpf,
        "name": data.name,
        "birthdate": data.birthdate,
        "bio": data.bio,
        "interests": data.interests,
        "photo": data.photo,
        "matches_quota": 5,
        "matches_used": 0,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    user.pop("_id", None)
    return user


@api_router.post("/users/{user_id}/unlock-pack")
async def unlock_pack(user_id: str):
    """Mocked R$40 purchase: unlocks +20 matches. TODO: integrate Stripe."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    new_quota = (user.get("matches_quota", 5)) + 20
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"matches_quota": new_quota}, "$push": {"packs": {"amount_brl": 40, "matches": 20, "purchased_at": now_iso()}}},
    )
    return {"matches_quota": new_quota, "matches_used": user.get("matches_used", 0)}


@api_router.get("/users/{user_id}/quota")
async def user_quota(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "matches_quota": 1, "matches_used": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {
        "matches_quota": user.get("matches_quota", 5),
        "matches_used": user.get("matches_used", 0),
        "remaining": max(0, user.get("matches_quota", 5) - user.get("matches_used", 0)),
    }


# ========== ROOMS ==========
@api_router.post("/rooms")
async def create_room(data: RoomCreate, host: dict = Depends(get_current_host)):
    if not host.get("plan"):
        raise HTTPException(status_code=402, detail="Escolha um plano antes de criar salas")
    code = gen_room_code()
    while await db.rooms.find_one({"code": code}):
        code = gen_room_code()
    room = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": data.name,
        "description": data.description,
        "host_id": host["id"],
        "latitude": data.latitude,
        "longitude": data.longitude,
        "radius_m": data.radius_m or 200,
        "active": True,
        "created_at": now_iso(),
    }
    await db.rooms.insert_one(room)
    room.pop("_id", None)
    return room


@api_router.get("/rooms/host")
async def list_host_rooms(host: dict = Depends(get_current_host)):
    rooms = await db.rooms.find({"host_id": host["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rooms


@api_router.get("/rooms/by-code/{code}")
async def get_room_by_code(code: str):
    room = await db.rooms.find_one({"code": code.upper(), "active": True}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada ou encerrada")
    return room


@api_router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    return room


@api_router.get("/rooms/{room_id}/stats")
async def get_room_stats(room_id: str, host: dict = Depends(get_current_host)):
    room = await db.rooms.find_one({"id": room_id, "host_id": host["id"]})
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    participants = await db.participants.count_documents({"room_id": room_id})
    swipes = await db.swipes.count_documents({"room_id": room_id})
    likes = await db.swipes.count_documents({"room_id": room_id, "liked": True})
    matches = await db.matches.count_documents({"room_id": room_id})
    reports_open = await db.reports.count_documents({"room_id": room_id, "status": "open"})
    return {
        "participants": participants,
        "swipes": swipes,
        "likes": likes,
        "matches": matches,
        "reports_open": reports_open,
    }


@api_router.post("/rooms/{room_id}/close")
async def close_room(room_id: str, host: dict = Depends(get_current_host)):
    res = await db.rooms.update_one({"id": room_id, "host_id": host["id"]}, {"$set": {"active": False}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    return {"ok": True}


# ========== PARTICIPANTS ==========
@api_router.post("/participants/join")
async def join_room(data: ParticipantCreate):
    room = await db.rooms.find_one({"code": data.room_code.upper(), "active": True})
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada ou encerrada")
    # Geo-fence validation
    r_lat = room.get("latitude")
    r_lng = room.get("longitude")
    radius = room.get("radius_m", 200)
    if r_lat is not None and r_lng is not None:
        dist = haversine_m(r_lat, r_lng, data.latitude, data.longitude)
        if dist > radius:
            raise HTTPException(
                status_code=403,
                detail=f"Você está fora do raio do rolê (~{int(dist)}m). Aproxime-se do local para entrar.",
            )
    # Resolve user
    user = await db.users.find_one({"id": data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Perfil de usuário não encontrado")
    age = calc_age(user["birthdate"]) if user.get("birthdate") else 0
    if age < 18:
        raise HTTPException(status_code=403, detail="Apenas maiores de 18 anos.")
    # Check ban from this room's host
    ban = await db.host_bans.find_one({"host_id": room["host_id"], "user_id": user["id"]})
    if ban:
        exp = ban.get("expires_at")
        active = True
        if exp:
            try:
                if datetime.fromisoformat(exp) < datetime.now(timezone.utc):
                    active = False
            except Exception:
                pass
        if active:
            label = {
                "timeout_1d": "Você está em timeout de 24h",
                "timeout_30d": "Você está em timeout de 30 dias",
                "ban": "Você foi banido permanentemente das salas deste anfitrião",
            }.get(ban.get("type"), "Acesso bloqueado pelo anfitrião")
            raise HTTPException(status_code=403, detail=label)
    # Check if user already in room - return same participant
    existing = await db.participants.find_one({"room_id": room["id"], "user_id": user["id"]}, {"_id": 0})
    if existing:
        return {
            "participant": existing,
            "room": {"id": room["id"], "code": room["code"], "name": room["name"]},
        }
    participant = {
        "id": str(uuid.uuid4()),
        "room_id": room["id"],
        "user_id": user["id"],
        "name": user["name"],
        "age": age,
        "bio": user.get("bio", ""),
        "interests": user.get("interests", []),
        "photo": user["photo"],
        "latitude": data.latitude,
        "longitude": data.longitude,
        "created_at": now_iso(),
    }
    await db.participants.insert_one(participant)
    participant.pop("_id", None)
    return {
        "participant": participant,
        "room": {"id": room["id"], "code": room["code"], "name": room["name"]},
    }


@api_router.get("/rooms/{room_id}/participants")
async def list_participants(room_id: str, host: dict = Depends(get_current_host)):
    room = await db.rooms.find_one({"id": room_id, "host_id": host["id"]})
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    parts = await db.participants.find({"room_id": room_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return parts


@api_router.get("/rooms/{room_id}/deck")
async def get_deck(room_id: str, participant_id: str):
    swiped = await db.swipes.find({"room_id": room_id, "participant_id": participant_id}, {"_id": 0, "target_id": 1}).to_list(1000)
    swiped_ids = [s["target_id"] for s in swiped]
    swiped_ids.append(participant_id)
    deck = await db.participants.find(
        {"room_id": room_id, "id": {"$nin": swiped_ids}},
        {"_id": 0}
    ).to_list(100)
    return deck


# ========== SWIPES & MATCHES ==========
MATCH_TTL_SECONDS = 5 * 60  # 5 minutes — match self-destructs after this


@api_router.post("/swipes")
async def create_swipe(data: SwipeCreate):
    swipe = {
        "id": str(uuid.uuid4()),
        "room_id": data.room_id,
        "participant_id": data.participant_id,
        "target_id": data.target_id,
        "liked": data.liked,
        "created_at": now_iso(),
    }
    await db.swipes.insert_one(swipe)

    is_match = False
    match = None
    quota_exceeded = False
    if data.liked:
        reciprocal = await db.swipes.find_one({
            "room_id": data.room_id,
            "participant_id": data.target_id,
            "target_id": data.participant_id,
            "liked": True,
        })
        if reciprocal:
            # Check current swiper's quota
            me_part = await db.participants.find_one({"id": data.participant_id})
            if me_part and me_part.get("user_id"):
                me_user = await db.users.find_one({"id": me_part["user_id"]})
                if me_user:
                    used = me_user.get("matches_used", 0)
                    quota = me_user.get("matches_quota", 5)
                    if used >= quota:
                        return {"is_match": False, "match": None, "quota_exceeded": True}

            ids_sorted = sorted([data.participant_id, data.target_id])
            existing_match = await db.matches.find_one({
                "room_id": data.room_id,
                "user_a": ids_sorted[0],
                "user_b": ids_sorted[1],
            })
            now_dt = datetime.now(timezone.utc)
            expires_at = (now_dt + timedelta(seconds=MATCH_TTL_SECONDS)).isoformat()
            if existing_match:
                match = {k: v for k, v in existing_match.items() if k != "_id"}
            else:
                match = {
                    "id": str(uuid.uuid4()),
                    "room_id": data.room_id,
                    "user_a": ids_sorted[0],
                    "user_b": ids_sorted[1],
                    "created_at": now_dt.isoformat(),
                    "expires_at": expires_at,
                }
                await db.matches.insert_one(match)
                match.pop("_id", None)
                # Increment matches_used for BOTH users
                for pid in ids_sorted:
                    p = await db.participants.find_one({"id": pid})
                    if p and p.get("user_id"):
                        await db.users.update_one(
                            {"id": p["user_id"]}, {"$inc": {"matches_used": 1}}
                        )
            is_match = True
    return {"is_match": is_match, "match": match, "quota_exceeded": quota_exceeded}


@api_router.get("/rooms/{room_id}/matches")
async def list_matches(room_id: str, participant_id: str):
    matches = await db.matches.find(
        {"room_id": room_id, "$or": [{"user_a": participant_id}, {"user_b": participant_id}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    now_dt = datetime.now(timezone.utc)
    result = []
    for m in matches:
        # Skip expired matches
        try:
            exp = datetime.fromisoformat(m.get("expires_at")) if m.get("expires_at") else None
        except Exception:
            exp = None
        if exp and exp < now_dt:
            continue
        other_id = m["user_b"] if m["user_a"] == participant_id else m["user_a"]
        other = await db.participants.find_one({"id": other_id}, {"_id": 0})
        if other:
            last_msg = await db.messages.find_one(
                {"match_id": m["id"]}, {"_id": 0}, sort=[("created_at", -1)]
            )
            result.append({
                "match_id": m["id"],
                "other": other,
                "created_at": m["created_at"],
                "expires_at": m.get("expires_at"),
                "last_message": last_msg,
            })
    return result


@api_router.get("/matches/{match_id}")
async def get_match(match_id: str):
    m = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Match não encontrado")
    return m


# ========== MESSAGES ==========
@api_router.get("/matches/{match_id}/messages")
async def list_messages(match_id: str):
    msgs = await db.messages.find({"match_id": match_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return msgs


@api_router.post("/matches/{match_id}/messages")
async def send_message(match_id: str, data: MessageCreate):
    match = await db.matches.find_one({"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match não encontrado")
    if data.participant_id not in [match["user_a"], match["user_b"]]:
        raise HTTPException(status_code=403, detail="Não autorizado")
    # Check expiration
    try:
        exp = datetime.fromisoformat(match.get("expires_at")) if match.get("expires_at") else None
    except Exception:
        exp = None
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Esse match expirou.")
    msg = {
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "sender_id": data.participant_id,
        "text": data.text,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


# ========== REPORTS ==========
@api_router.post("/reports")
async def create_report(data: ReportCreate):
    report = {
        "id": str(uuid.uuid4()),
        "room_id": data.room_id,
        "reporter_id": data.reporter_id,
        "reported_id": data.reported_id,
        "reason": data.reason,
        "description": data.description,
        "status": "open",
        "created_at": now_iso(),
    }
    await db.reports.insert_one(report)
    report.pop("_id", None)
    return report


@api_router.get("/rooms/{room_id}/reports")
async def list_reports(room_id: str, host: dict = Depends(get_current_host)):
    room = await db.rooms.find_one({"id": room_id, "host_id": host["id"]})
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    reports = await db.reports.find({"room_id": room_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    enriched = []
    for r in reports:
        reporter = await db.participants.find_one({"id": r["reporter_id"]}, {"_id": 0, "photo": 0})
        reported = await db.participants.find_one({"id": r["reported_id"]}, {"_id": 0, "photo": 0})
        r["reporter"] = reporter
        r["reported"] = reported
        enriched.append(r)
    return enriched


@api_router.put("/reports/{report_id}/resolve")
async def resolve_report(report_id: str, host: dict = Depends(get_current_host)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    room = await db.rooms.find_one({"id": report["room_id"], "host_id": host["id"]})
    if not room:
        raise HTTPException(status_code=403, detail="Não autorizado")
    await db.reports.update_one({"id": report_id}, {"$set": {"status": "resolved"}})
    return {"ok": True}


@api_router.get("/reports/{report_id}")
async def get_report_detail(report_id: str, host: dict = Depends(get_current_host)):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    room = await db.rooms.find_one({"id": report["room_id"], "host_id": host["id"]}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=403, detail="Não autorizado")
    reporter = await db.participants.find_one({"id": report["reporter_id"]}, {"_id": 0})
    reported = await db.participants.find_one({"id": report["reported_id"]}, {"_id": 0})
    report["reporter"] = reporter
    report["reported"] = reported
    report["room"] = {"id": room["id"], "name": room["name"], "code": room["code"]}
    # find any existing ban
    if reported and reported.get("user_id"):
        ban = await db.host_bans.find_one(
            {"host_id": host["id"], "user_id": reported["user_id"]},
            {"_id": 0},
        )
        report["existing_ban"] = ban
    return report


from fastapi import Request


async def _auth_for_report(report_id: str, request: Request, participant_id: Optional[str]):
    """Return (sender_role, sender_id) — host (JWT) or reporter (participant_id matches)."""
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = jwt.decode(auth.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
            host_id = payload.get("host_id")
            room = await db.rooms.find_one({"id": report["room_id"], "host_id": host_id})
            if room:
                return report, "host", host_id
        except Exception:
            pass
    if participant_id and participant_id == report["reporter_id"]:
        return report, "reporter", participant_id
    raise HTTPException(status_code=403, detail="Não autorizado")


@api_router.get("/reports/{report_id}/messages")
async def list_report_messages(
    report_id: str,
    request: Request,
    participant_id: Optional[str] = None,
):
    await _auth_for_report(report_id, request, participant_id)
    msgs = await db.report_messages.find({"report_id": report_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs


@api_router.post("/reports/{report_id}/messages")
async def post_report_message(
    report_id: str,
    data: ReportMessageCreate,
    request: Request,
):
    _, role, sender_id = await _auth_for_report(report_id, request, data.participant_id)
    msg = {
        "id": str(uuid.uuid4()),
        "report_id": report_id,
        "sender_role": role,
        "sender_id": sender_id,
        "text": data.text,
        "created_at": now_iso(),
    }
    await db.report_messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


@api_router.get("/hosts/me/bans")
async def list_host_bans(host: dict = Depends(get_current_host)):
    bans = await db.host_bans.find({"host_id": host["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    now_dt = datetime.now(timezone.utc)
    enriched = []
    for b in bans:
        u = await db.users.find_one({"id": b["user_id"]}, {"_id": 0, "matches_quota": 0, "matches_used": 0})
        b["user"] = u
        # active?
        active = True
        exp = b.get("expires_at")
        if exp:
            try:
                active = datetime.fromisoformat(exp) > now_dt
            except Exception:
                active = True
        b["active"] = active
        enriched.append(b)
    return enriched


@api_router.delete("/hosts/me/bans/{ban_id}")
async def lift_ban(ban_id: str, host: dict = Depends(get_current_host)):
    res = await db.host_bans.delete_one({"id": ban_id, "host_id": host["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banimento não encontrado")
    return {"ok": True}


@api_router.post("/reports/{report_id}/action")
async def take_report_action(
    report_id: str, data: ReportActionCreate, host: dict = Depends(get_current_host)
):
    if data.action not in ("timeout_1d", "timeout_30d", "ban"):
        raise HTTPException(status_code=400, detail="Ação inválida")
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    room = await db.rooms.find_one({"id": report["room_id"], "host_id": host["id"]})
    if not room:
        raise HTTPException(status_code=403, detail="Não autorizado")
    reported = await db.participants.find_one({"id": report["reported_id"]})
    if not reported or not reported.get("user_id"):
        raise HTTPException(status_code=404, detail="Denunciado não encontrado")
    now_dt = datetime.now(timezone.utc)
    if data.action == "timeout_1d":
        expires = (now_dt + timedelta(days=1)).isoformat()
    elif data.action == "timeout_30d":
        expires = (now_dt + timedelta(days=30)).isoformat()
    else:
        expires = None  # forever
    ban = {
        "id": str(uuid.uuid4()),
        "host_id": host["id"],
        "user_id": reported["user_id"],
        "type": data.action,
        "expires_at": expires,
        "report_id": report_id,
        "created_at": now_dt.isoformat(),
    }
    # upsert (replace any existing ban from same host on same user)
    await db.host_bans.delete_many({"host_id": host["id"], "user_id": reported["user_id"]})
    await db.host_bans.insert_one(ban)
    await db.reports.update_one(
        {"id": report_id},
        {"$set": {"status": "resolved", "action": data.action, "action_at": now_iso()}},
    )
    ban.pop("_id", None)
    return ban


@api_router.get("/")
async def root():
    return {"message": "Te Achei API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    admin_email = "admin@demo.com"
    existing = await db.hosts.find_one({"email": admin_email})
    if not existing:
        await db.hosts.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password": hash_password("password123"),
            "name": "Admin Demo",
            "plan": None,
            "created_at": now_iso(),
        })
        logger.info("Seeded default host admin@demo.com / password123")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
