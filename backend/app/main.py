from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from .database import create_db_and_tables
from .auth import create_access_token
from .routes import router

app = FastAPI(title="Personal Finance Tracker API")

# Allow your React Native app to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for assignment/demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Simple demo login (assignment-friendly)
@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username == "admin" and form_data.password == "password":
        token = create_access_token({"sub": form_data.username})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

app.include_router(router)
