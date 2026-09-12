import os
from functools import wraps
from flask import request, jsonify
import jwt

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            try:
                token = request.headers['Authorization'].split(' ')[1]
            except IndexError:
                return jsonify({'message': 'Token format is invalid'}), 401

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            jwt_secret = os.environ.get('SUPABASE_JWT_SECRET')
            if not jwt_secret:
                return jsonify({'message': 'Server configuration error: JWT secret not set'}), 500
            
            # Decode without verification first to check the token structure
            # Note: Supabase uses HS256 algorithm and requires audience verification
            data = jwt.decode(
                token, 
                jwt_secret, 
                algorithms=['HS256'],
                options={
                    'verify_aud': False  # Disable audience verification for now
                }
            )
            # You can optionally pass the user data to the route
            # g.current_user = data
        except jwt.ExpiredSignatureError:
            print("JWT Error: Token has expired")
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            print(f"JWT Error: Token is invalid - {str(e)}")
            return jsonify({'message': f'Token is invalid: {str(e)}'}), 401
        except Exception as e:
            print(f"JWT Error: Unexpected error - {str(e)}")
            return jsonify({'message': f'Token validation error: {str(e)}'}), 401

        return f(*args, **kwargs)

    return decorated
