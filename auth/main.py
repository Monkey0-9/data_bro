from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import pyotp
import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import uuid

app = FastAPI(title="NEXUS Auth Service")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "nexus_super_secret_key_change_in_prod"
ALGORITHM = "HS256"

# Mock DB for phase 2 initial implementation
mock_users_db = {}

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str
    totp_code: str | None = None

@app.post("/register")
async def register(user: UserCreate):
    if user.email in mock_users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user.password)
    user_id = str(uuid.uuid4())
    mock_users_db[user.email] = {
        "id": user_id,
        "password": hashed_password,
        "totp_secret": None
    }
    return {"message": "User registered successfully", "id": user_id}

@app.post("/totp/enable")
async def enable_totp(email: str):
    user = mock_users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    secret = pyotp.random_base32()
    user["totp_secret"] = secret
    
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name="NEXUS")
    return {"secret": secret, "uri": totp_uri}

@app.post("/login")
async def login(user_login: UserLogin):
    user = mock_users_db.get(user_login.email)
    if not user or not pwd_context.verify(user_login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user["totp_secret"]:
        if not user_login.totp_code:
            raise HTTPException(status_code=401, detail="TOTP code required")
        totp = pyotp.TOTP(user["totp_secret"])
        if not totp.verify(user_login.totp_code):
            raise HTTPException(status_code=401, detail="Invalid TOTP code")
            
    # Generate JWT
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {"sub": user["id"], "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return {"access_token": encoded_jwt, "token_type": "bearer"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
