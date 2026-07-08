import os

os.environ["SECRET_KEY"] = "test-secret"

import pytest
from fastapi.testclient import TestClient

from auth import hash_password
from database import Base, SessionLocal, engine
from main import app
from models import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def register(email="alice@example.com", password="password123", full_name="Alice"):
    res = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert res.status_code == 201
    return res.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_and_login():
    register()
    res = client.post(
        "/auth/login",
        data={"username": "alice@example.com", "password": "password123"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_contact_crud_scoped_to_owner():
    token = register()
    headers = auth_headers(token)

    res = client.post("/contacts", json={"name": "Bob"}, headers=headers)
    assert res.status_code == 201
    contact_id = res.json()["id"]

    res = client.get("/contacts", headers=headers)
    assert len(res.json()) == 1

    res = client.put(
        f"/contacts/{contact_id}", json={"phone": "555-1234"}, headers=headers
    )
    assert res.status_code == 200
    assert res.json()["phone"] == "555-1234"

    res = client.delete(f"/contacts/{contact_id}", headers=headers)
    assert res.status_code == 204


def test_non_admin_cannot_list_users():
    token = register()
    res = client.get("/users", headers=auth_headers(token))
    assert res.status_code == 403


def make_admin(email="admin@example.com", password="adminpass123"):
    db = SessionLocal()
    admin = User(
        email=email,
        hashed_password=hash_password(password),
        full_name="Admin",
        is_admin=True,
    )
    db.add(admin)
    db.commit()
    db.close()
    res = client.post("/auth/login", data={"username": email, "password": password})
    return res.json()["access_token"]


def test_admin_can_list_and_manage_users():
    user_token = register()
    admin_token = make_admin()

    res = client.get("/users", headers=auth_headers(admin_token))
    assert res.status_code == 200
    assert len(res.json()) == 2

    user_id = client.get("/auth/me", headers=auth_headers(user_token)).json()["id"]
    res = client.delete(f"/users/{user_id}", headers=auth_headers(admin_token))
    assert res.status_code == 204
