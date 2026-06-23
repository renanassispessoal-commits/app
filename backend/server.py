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
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
SECRET_KEY = os.environ['JWT_SECRET_KEY']
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days

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

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    host: dict

class RoomCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ParticipantCreate(BaseModel):
    room_code: str
    name: str
    age: int
    bio: str
    interests: List[str] = []
    photo: str  # base64

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
    reason: str  # 'abuse', 'harassment', 'spam', 'other'
    description: Optional[str] = ""


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
        "created_at": now_iso(),
    }
    await db.hosts.insert_one(host)
    token = create_access_token({"host_id": host["id"], "role": "host"})
    return Token(access_token=token, host={"id": host["id"], "email": host["email"], "name": host["name"]})


@api_router.post("/auth/host/login", response_model=Token)
async def login_host(data: HostLogin):
    host = await db.hosts.find_one({"email": data.email.lower()})
    if not host or not verify_password(data.password, host["password"]):
        raise HTTPException(status_code=400, detail="Email ou senha incorretos")
    token = create_access_token({"host_id": host["id"], "role": "host"})
    return Token(access_token=token, host={"id": host["id"], "email": host["email"], "name": host["name"]})


@api_router.get("/auth/host/me")
async def get_me(host: dict = Depends(get_current_host)):
    return host


# ========== ROOMS ==========
@api_router.post("/rooms")
async def create_room(data: RoomCreate, host: dict = Depends(get_current_host)):
    code = gen_room_code()
    while await db.rooms.find_one({"code": code}):
        code = gen_room_code()
    room = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": data.name,
        "description": data.description,
        "host_id": host["id"],
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
    participant = {
        "id": str(uuid.uuid4()),
        "room_id": room["id"],
        "name": data.name,
        "age": data.age,
        "bio": data.bio,
        "interests": data.interests,
        "photo": data.photo,
        "created_at": now_iso(),
    }
    await db.participants.insert_one(participant)
    participant.pop("_id", None)
    return {"participant": participant, "room": {"id": room["id"], "code": room["code"], "name": room["name"]}}


@api_router.get("/rooms/{room_id}/participants")
async def list_participants(room_id: str, host: dict = Depends(get_current_host)):
    room = await db.rooms.find_one({"id": room_id, "host_id": host["id"]})
    if not room:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    parts = await db.participants.find({"room_id": room_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return parts


@api_router.get("/rooms/{room_id}/deck")
async def get_deck(room_id: str, participant_id: str):
    # find ids the participant already swiped
    swiped = await db.swipes.find({"room_id": room_id, "participant_id": participant_id}, {"_id": 0, "target_id": 1}).to_list(1000)
    swiped_ids = [s["target_id"] for s in swiped]
    swiped_ids.append(participant_id)
    deck = await db.participants.find(
        {"room_id": room_id, "id": {"$nin": swiped_ids}},
        {"_id": 0}
    ).to_list(100)
    return deck


# ========== SWIPES & MATCHES ==========
@api_router.post("/swipes")
async def create_swipe(data: SwipeCreate):
    # save swipe
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
    if data.liked:
        # check reciprocal
        reciprocal = await db.swipes.find_one({
            "room_id": data.room_id,
            "participant_id": data.target_id,
            "target_id": data.participant_id,
            "liked": True,
        })
        if reciprocal:
            # create match (avoid duplicate)
            ids_sorted = sorted([data.participant_id, data.target_id])
            existing_match = await db.matches.find_one({"room_id": data.room_id, "user_a": ids_sorted[0], "user_b": ids_sorted[1]})
            if existing_match:
                match = {k: v for k, v in existing_match.items() if k != "_id"}
            else:
                match = {
                    "id": str(uuid.uuid4()),
                    "room_id": data.room_id,
                    "user_a": ids_sorted[0],
                    "user_b": ids_sorted[1],
                    "created_at": now_iso(),
                }
                await db.matches.insert_one(match)
                match.pop("_id", None)
            is_match = True
    return {"is_match": is_match, "match": match}


@api_router.get("/rooms/{room_id}/matches")
async def list_matches(room_id: str, participant_id: str):
    matches = await db.matches.find(
        {"room_id": room_id, "$or": [{"user_a": participant_id}, {"user_b": participant_id}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    # enrich with other participant info
    result = []
    for m in matches:
        other_id = m["user_b"] if m["user_a"] == participant_id else m["user_a"]
        other = await db.participants.find_one({"id": other_id}, {"_id": 0})
        if other:
            # last message
            last_msg = await db.messages.find_one(
                {"match_id": m["id"]},
                {"_id": 0},
                sort=[("created_at", -1)],
            )
            result.append({
                "match_id": m["id"],
                "other": other,
                "created_at": m["created_at"],
                "last_message": last_msg,
            })
    return result


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
    # enrich
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


# ========== HEALTH ==========
@api_router.get("/")
async def root():
    return {"message": "LoungeMatch API", "status": "ok"}


# Include the router in the main app
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
    # Seed default host
    admin_email = "admin@demo.com"
    existing = await db.hosts.find_one({"email": admin_email})
    if not existing:
        await db.hosts.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password": hash_password("password123"),
            "name": "Admin Demo",
            "created_at": now_iso(),
        })
        logger.info("Seeded default host admin@demo.com / password123")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
