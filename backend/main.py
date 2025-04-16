from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.orm import Session

from database import get_db
from models import User

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserRegistration(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    privacy_consent: bool

@app.post("/api/register")
async def register_user(user: UserRegistration, db: Session = Depends(get_db)):
    if not user.privacy_consent:
        raise HTTPException(status_code=400, detail="Privacy consent is required")
    
    db_user = User(
        email=user.email,
        first_name=user.first_name,
        privacy_consent=user.privacy_consent
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return {"status": "success", "message": "User registered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"} 