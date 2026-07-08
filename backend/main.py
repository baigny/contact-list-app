import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from auth import (
    CurrentAdmin,
    CurrentUser,
    DbDep,
    create_access_token,
    hash_password,
    verify_password,
)
from database import Base, SessionLocal, engine
from models import Contact, User
from schemas import (
    ContactCreate,
    ContactRead,
    ContactUpdate,
    Token,
    UserCreate,
    UserRead,
    UserUpdate,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        if db.query(User).count() == 0:
            temp_password = secrets.token_urlsafe(9)
            admin = User(
                email="admin@example.com",
                hashed_password=hash_password(temp_password),
                full_name="Admin",
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            print("=" * 60)
            print("Seeded default admin account:")
            print("  email:    admin@example.com")
            print(f"  password: {temp_password}")
            print("=" * 60)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Contact List API",
    description="A JWT-authenticated contact list API with admin-managed users.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://contact-list-app.netlify.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_admin_or_self(target_id: int, current_user: User) -> None:
    if not current_user.is_admin and current_user.id != target_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user",
        )


# ---------- Auth ----------


@app.post("/auth/register", response_model=Token, status_code=201)
def register(user_in: UserCreate, db: DbDep):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        is_admin=False,
    )
    db.add(user)
    db.commit()
    return Token(access_token=create_access_token(user.email))


@app.post("/auth/login", response_model=Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbDep
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(user.email))


@app.get("/auth/me", response_model=UserRead)
def read_me(current_user: CurrentUser):
    return current_user


# ---------- Users (admin-managed CRUD) ----------


@app.get("/users", response_model=list[UserRead])
def list_users(_: CurrentAdmin, db: DbDep):
    return db.query(User).all()


@app.post("/users", response_model=UserRead, status_code=201)
def create_user(user_in: UserCreate, _: CurrentAdmin, db: DbDep):
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        is_admin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/users/{user_id}", response_model=UserRead)
def get_user(user_id: int, current_user: CurrentUser, db: DbDep):
    _require_admin_or_self(user_id, current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.put("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int, update: UserUpdate, current_user: CurrentUser, db: DbDep
):
    _require_admin_or_self(user_id, current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if update.is_admin is not None:
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can change admin status",
            )
        user.is_admin = update.is_admin
    if update.email is not None:
        user.email = update.email
    if update.full_name is not None:
        user.full_name = update.full_name
    if update.password is not None:
        user.hashed_password = hash_password(update.password)

    db.commit()
    db.refresh(user)
    return user


@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, current_user: CurrentUser, db: DbDep):
    _require_admin_or_self(user_id, current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


# ---------- Contacts (personal CRUD) ----------


@app.get("/contacts", response_model=list[ContactRead])
def list_contacts(current_user: CurrentUser, db: DbDep):
    return db.query(Contact).filter(Contact.owner_id == current_user.id).all()


@app.post("/contacts", response_model=ContactRead, status_code=201)
def create_contact(contact_in: ContactCreate, current_user: CurrentUser, db: DbDep):
    contact = Contact(**contact_in.model_dump(), owner_id=current_user.id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def _get_owned_contact(contact_id: int, current_user: User, db: Session) -> Contact:
    contact = db.get(Contact, contact_id)
    if not contact or contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@app.get("/contacts/{contact_id}", response_model=ContactRead)
def get_contact(contact_id: int, current_user: CurrentUser, db: DbDep):
    return _get_owned_contact(contact_id, current_user, db)


@app.put("/contacts/{contact_id}", response_model=ContactRead)
def update_contact(
    contact_id: int, update: ContactUpdate, current_user: CurrentUser, db: DbDep
):
    contact = _get_owned_contact(contact_id, current_user, db)
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


@app.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int, current_user: CurrentUser, db: DbDep):
    contact = _get_owned_contact(contact_id, current_user, db)
    db.delete(contact)
    db.commit()
