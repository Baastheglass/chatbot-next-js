# backend/auth_middleware.py
import json
import base64
import os
import time
import logging
from fastapi import Request, HTTPException
from typing import Optional

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def get_token_from_request(request: Request) -> Optional[str]:
    """Extract token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return None

async def verify_token(request: Request):
    """Verify simple base64 encoded token from frontend"""
    try:
        token = await get_token_from_request(request)
        if not token:
            logger.info("No token found in request")
            raise HTTPException(status_code=401, detail="Authentication token is missing")
        
        try:
            # Decode the base64 token
            decoded_bytes = base64.b64decode(token)
            token_data = json.loads(decoded_bytes.decode('utf-8'))
            
            logger.debug(f"Decoded token data: {token_data}")
            
            # Validate token data
            if not token_data.get('email'):
                raise HTTPException(status_code=401, detail="Invalid token: missing email")
            
            # Check if token is not too old (optional - 24 hours)
            token_age = (1000 * 60 * 60 * 24)  # 24 hours in milliseconds
            if 'timestamp' in token_data:
                current_time = int(time.time() * 1000)
                if current_time - token_data['timestamp'] > token_age:
                    raise HTTPException(status_code=401, detail="Token has expired")
            
            # Add user info to request state for use in endpoints
            request.state.user_email = token_data.get("email")
            request.state.session_id = token_data.get("sessionId", "default-session")
            logger.info(f"Token verified for user: {token_data.get('email')}")
            
        except (base64.binascii.Error, json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.error(f"Token decode error: {e}")
            raise HTTPException(status_code=401, detail="Invalid token format")
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth middleware error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")