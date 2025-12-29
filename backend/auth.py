from fastapi import Header, HTTPException
from jose import jwt

# MVP: aceita "dev-token" sem validação.
# Produção: implementar login + secret real + exp/iss/aud.
SECRET = "CHANGE_ME_PROD"
ALGO = "HS256"

def require_auth(authorization: str = Header(default="")) -> dict:
  if not authorization.startswith("Bearer "):
    raise HTTPException(status_code=401, detail="Missing bearer token")

  token = authorization.replace("Bearer ", "").strip()
  if token == "dev-token":
    return {"sub": "dev", "role": "teacher"}

  try:
    payload = jwt.decode(token, SECRET, algorithms=[ALGO])
    return payload
  except Exception:
    raise HTTPException(status_code=401, detail="Invalid token")