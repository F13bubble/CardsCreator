from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status


from database import get_db
from models import User, Card

class GroupCreate(BaseModel):
    name: str = Field(min_length=3, max_length=50)
    description: str = Field(min_length=5, max_length=255)
    created_by: str = Field(min_length=3, max_length=50)
    rarity_ID: int