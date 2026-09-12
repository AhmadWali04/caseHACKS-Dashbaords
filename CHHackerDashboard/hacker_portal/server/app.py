from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase_client import supabase
from auth import token_required
import time
#from cache import cache_get, cache_set, cache_invalidate_leaderboards

app = Flask(__name__)
CORS(app)

@app.route("/api/hello", methods=["GET"])
def hello_world():
    return jsonify({"message": "Hello from Python Backend!"})

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


# helper function
def check_and_award_bounties(user_id, bounty_type, event_id=None):
    # get all bounties of this type not yet completed by user
    print("RUNNING")
    bounties = supabase.table("bounties")\
        .select("*")\
        .eq("type", bounty_type)\
        .execute().data

    completed_ids = {r["bounty_id"] for r in 
        supabase.table("user_bounties")
        .select("bounty_id").eq("user_id", user_id).execute().data}

    for bounty in bounties:
        if bounty["id"] in completed_ids:
            continue

        if bounty_type == "scan":
            count = len(supabase.table("hacker_to_hacker_scans")
                .select("id").eq("original_user_id", user_id).execute().data)
            print("COUNT", count)
        elif bounty_type == "checkin":
            #handle in internal dashboard since it has the event scan
            if bounty.get("event_id"):  # specific event bounty
                if bounty["event_id"] != event_id:
                    continue
                count = 1  # just being there is enough
            else:
                count = 0

        if count >= bounty["threshold"]:
            supabase.table("user_bounties").insert({
                "user_id": user_id,
                "bounty_id": bounty["id"],
            }).execute()
            #award bountry reward
            supabase.rpc("increment_interaction_points", {
                "user_id": user_id,
                "amount": bounty["points"]
            }).execute()


    return

# ==================== EVENTS / SCHEDULE ====================
@app.route("/api/events", methods=["GET"])
def get_events():
    """Get all events for the schedule"""
    try:
        response = supabase.table("events").select("*").order("starts_at").execute()
        return jsonify({"events": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== USER ====================
@app.route("/api/user", methods=["POST"])
@token_required
def create_user():
    """Create a new user record without status (user hasn't applied yet)"""
    try:
        data = request.get_json()
        email = data.get("email")
        name = data.get("name")
        user_id = data.get("id")
        
        if not email or not name or not user_id:
            return jsonify({"error": "Email, name, and id are required"}), 400
        
        # Check if user already exists
        existing = supabase.table("users").select("id").eq("email", email).execute()
        if existing.data and len(existing.data) > 0:
            return jsonify({"user": existing.data[0]}), 200
        
        # Create new user without status (null) - they haven't applied yet
        response = supabase.table("users").insert({
            "id": user_id,
            "email": email,
            "name": name,
            "status": None  # No status until they submit application
        }).execute()
        
        return jsonify({"user": response.data[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/user/<user_id>", methods=["GET"])
@token_required
def get_user(user_id):
    """Get user details by ID"""
    try:
        response = supabase.table("users").select("*, teams(*)").eq("id", user_id).single().execute()
        return jsonify({"user": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/user/<user_id>", methods=["PUT"])
@token_required
def update_user(user_id):
    """Update user profile. If team_id is being set to null, check if the old team is now empty and archive it."""
    try:
        data = request.get_json()
        allowed_fields = ['name', 'school', 'dietary', 'github', 'linkedin', 'other', 'team_id']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
 
        # ── Leave-team archiving logic ──────────────────────────────────────
        # If the caller is explicitly clearing team_id, check whether the old
        # team will be left empty and archive it (has_space = False) if so.
        if 'team_id' in update_data and update_data['team_id'] is None:
            user_res = supabase.table("users").select("team_id").eq("id", user_id).single().execute()
            old_team_id = (user_res.data or {}).get("team_id")
 
            if old_team_id:
                # Count remaining members excluding this user
                members_res = supabase.table("users") \
                    .select("id") \
                    .eq("team_id", old_team_id) \
                    .neq("id", user_id) \
                    .execute()
 
                remaining = len(members_res.data or [])
                if remaining == 0:
                    # Team will be empty — archive it
                    supabase.table("teams").update({"has_space": False, "members": 0}) \
                        .eq("id", old_team_id).execute()
                else:
                    # Decrement member count
                    supabase.rpc("decrement_team_members", {"team_id": old_team_id}).execute()
 
            # Cancel all pending join requests this user has sent to any team
            supabase.table("team_invites") \
                .update({"status": "cancelled"}) \
                .eq("user_id", user_id) \
                .eq("status", "pending") \
                .execute()
        # ────────────────────────────────────────────────────────────────────
 
        response = supabase.table("users").update(update_data).eq("id", user_id).execute()
        return jsonify({"user": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
@app.route("/api/user/email/<email>", methods=["GET"])
@token_required
def get_user_by_email(email):
    """Get user details by email (includes status)"""
    try:
        response = supabase.table("users").select("*, teams(*)").eq("email", email).single().execute()
        return jsonify({"user": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 
'''
@app.route("/api/user/<user_id>/points", methods=["POST"])
# Removed token_required for testing purposes, can add back later
# @token_required
def add_points(user_id):
    """Add points to a user"""
    try:
        data = request.get_json()
        points_to_add = data.get("user_interaction_points", 0)
        
        # Get current points
        user_response = supabase.table("users").select("user_interaction_points").eq("id", user_id).single().execute()
        current_points = user_response.data.get("user_interaction_points", 0) or 0
        
        # Update with new points
        new_points = current_points + points_to_add
        response = supabase.table("users").update({"user_interaction_points": new_points}).eq("id", user_id).execute()
        
        return jsonify({"points": new_points, "added": points_to_add})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
'''
# ==================== TEAMS ====================
@app.route("/api/teams", methods=["GET"])
def get_teams():
    """Get all teams"""
    try:
        response = supabase.table("teams").select("*").execute()
        return jsonify({"teams": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/teams", methods=["POST"])
@token_required
def create_team():
    """Create a new team and add creator as member"""
    try:
        data = request.get_json()
        team_name = data.get("name")
        looking_for = data.get("looking_for", "")
        has_space = data.get("has_space", True)
        creator_email = data.get("creator_email")
        
        if not team_name:
            return jsonify({"error": "Team name is required"}), 400
        
        # Create the team
        team_response = supabase.table("teams").insert({
            "name": team_name,
            "looking_for": looking_for,
            "has_space": has_space,
            "members": 1 if creator_email else 0,
        }).execute()
        
        if team_response.data and len(team_response.data) > 0:
            team_id = team_response.data[0]["id"]
            
            # Add creator to the team if email provided
            if creator_email:
                # Look up creator id before updating
                creator_res = supabase.table("users").select("id") \
                    .eq("email", creator_email).single().execute()
 
                supabase.table("users").update({
                    "team_id": team_id
                }).eq("email", creator_email).execute()
 
                # Cancel any pending join requests the creator had sent to other teams
                if creator_res.data:
                    creator_id = creator_res.data["id"]
                    supabase.table("team_invites") \
                        .update({"status": "rejected"}) \
                        .eq("user_id", creator_id) \
                        .eq("status", "pending") \
                        .execute()
            
            return jsonify({"team": team_response.data[0]})
        else:
            return jsonify({"error": "Failed to create team"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/teams/available", methods=["GET"])
def get_available_teams():
    """Get teams that have space for new members"""
    try:
        response = supabase.table("teams").select("*, users(id, name, email)").eq("has_space", True).execute()
        return jsonify({"teams": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/team/<team_id>", methods=["GET"])
def get_team(team_id):
    """Get team details with members"""
    try:
        response = supabase.table("teams").select("*, users(*)").eq("id", team_id).single().execute()
        return jsonify({"team": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/team/<team_id>", methods=["PUT"])
@token_required
def update_team(team_id):
    """Update team details"""
    try:
        data = request.get_json()
        # Only allow updating certain fields
        allowed_fields = ['name', 'looking_for', 'has_space']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        response = supabase.table("teams").update(update_data).eq("id", team_id).execute()
        return jsonify({"team": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== ANNOUNCEMENTS ====================
@app.route("/api/announcements", methods=["GET"])
def get_announcements():
    """Get all announcements"""
    try:
        response = supabase.table("announcements").select("*, users(name)").order("created_at", desc=True).execute()
        return jsonify({"announcements": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== CHECK-INS ====================
@app.route("/api/checkins/<user_id>", methods=["GET"])
def get_user_checkins(user_id):
    """Get all check-ins for a user"""
    try:
        response = supabase.table("checkins").select("*, events(*)").eq("user_id", user_id).execute()
        return jsonify({"checkins": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/checkin", methods=["POST"])
@token_required
def create_checkin():
    """Create a check-in for an event"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        event_id = data.get("event_id")
        user_name = data.get("user_name", "")
        
        response = supabase.table("checkins").insert({
            "user_id": user_id,
            "event_id": event_id,
            "user_name": user_name
        }).execute()
        return jsonify({"checkin": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== DASHBOARD ====================
@app.route("/api/dashboard/<user_id>", methods=["GET"])
@token_required
def get_dashboard(user_id):
    """Single endpoint: announcements + events + user checkins."""
    try:
        announcements_res = supabase.table("announcements") \
            .select("*, users(name)") \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()

        events_res = supabase.table("events") \
            .select("*") \
            .order("starts_at") \
            .execute()

        checkins_res = supabase.table("checkins") \
            .select("*, events(*)") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(3) \
            .execute()


        return jsonify({
            "announcements": announcements_res.data or [],
            "events": events_res.data or [],
            "checkins": checkins_res.data or [],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# ==================== APPLICATION STATUS ====================
@app.route("/api/application/<email>", methods=["GET"])
def get_application_status(email):
    """Get application status by email"""
    try:
        response = supabase.table("applications").select("id, email, name, status, created_at").eq("email", email).single().execute()
        return jsonify({"application": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== APPLICATION QUESTIONS ====================
@app.route("/api/application-questions", methods=["GET"])
def get_application_questions():
    """Get all application questions ordered by sort_order"""
    try:
        response = supabase.table("application_questions").select("*").order("sort_order").execute()
        return jsonify({"questions": response.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/application/submit", methods=["POST"])
@token_required
def submit_application():
    """Submit application with answers and update user status"""
    try:
        data = request.get_json()
        email = data.get("email")
        name = data.get("name")
        answers = data.get("answers", {})
        
        if not email or not name:
            return jsonify({"error": "Email and name are required"}), 400
        
        # Fetch all questions to get field_key mappings
        questions_response = supabase.table("application_questions").select("id, field_key").execute()
        question_map = {q["id"]: q["field_key"] for q in questions_response.data}
        
        # Create application record
        app_response = supabase.table("applications").insert({
            "email": email,
            "name": name,
            "status": "pending"
        }).execute()
        
        if not app_response.data or len(app_response.data) == 0:
            return jsonify({"error": "Failed to create application"}), 500
        
        application_id = app_response.data[0]["id"]
        
        # Create answer records and collect profile field mappings
        answer_records = []
        profile_updates = {}
        
        for question_id, answer_text in answers.items():
            answer_records.append({
                "application_id": application_id,
                "question_id": question_id,
                "answer_text": answer_text
            })
            
            # If this question has a field_key, map it to user profile
            field_key = question_map.get(question_id)
            if field_key:
                profile_updates[field_key] = answer_text
        
        if answer_records:
            supabase.table("application_answers").insert(answer_records).execute()
        
        # Update user status and profile fields in users table
        user_update = {"status": "pending"}
        user_update.update(profile_updates)
        
        supabase.table("users").update(user_update).eq("email", email).execute()
        
        return jsonify({"application": app_response.data[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# ==================== SCAN ====================
@token_required
@app.route("/api/scan/<scanner_id>", methods=["POST"])
async def submit_hacker_to_hacker_scan(scanner_id):
    """Submit table entry for a hacker to scan the qr code of another hacker with answers and update user status"""
    try:
        data = request.get_json()
        original_user_id = data.get("original_user_id")
        
        if not original_user_id or not scanner_id:
            return jsonify({"error": "Original user ID and scanner ID are required"}), 400
        
        async def insert_scan_record():
            # Create hacker to hacker scan record
            app_response = supabase.table("hacker_to_hacker_scans").insert({
                "original_user_id": original_user_id,
                "scanner_id": scanner_id,
            }).execute()
            return app_response
        
        app_response = await insert_scan_record()

        if not app_response.data or len(app_response.data) == 0:
            return jsonify({"error": "Failed to create hacker to hacker scan record"}), 500

        
        # Award +5 interaction points to the scanner only after confirmed successful insert
        supabase.rpc("increment_interaction_points", {
            "user_id": original_user_id,
            "amount": 5
        }).execute()
        
        #invalidate cache
        #cache_invalidate_leaderboards()
        #award scanning bounties if thresholds met
        check_and_award_bounties(user_id=original_user_id, bounty_type="scan", event_id=None)

        # Get scanner's name for success message
        scanner = supabase.table("users").select("name").eq("id", scanner_id).single().execute()
        user_name = scanner.data.get("name", "User") if scanner.data else "User"

        return jsonify({
            "success": True,
            "userName": user_name,
            "scan": app_response.data[0]
        }), 201
    except Exception as e:
        # Handle unique constraint violation
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            return jsonify({"error": "You have already scanned this user"}), 409
        return jsonify({"error": str(e)}), 500
    

# ==================== LEADERBOARD ====================
@app.route("/api/leaderboard", methods=["GET"])
@token_required
def get_leaderboard():
    """Get all users ranked by points"""
    #cached = cache_get("leaderboard:individual")
    #if cached:
    #    return jsonify(cached)
    try:
        response = supabase.table("users") \
            .select("id, name, email, event_attendance_points, user_interaction_points") \
            .eq("status", "accepted") \
            .execute()
        
        users = response.data
        for u in users:
            u["event_attendance_points"] = u.get("event_attendance_points") or 0
            u["user_interaction_points"] = u.get("user_interaction_points") or 0
            u["total_points"] = u["event_attendance_points"] + u["user_interaction_points"]
        
        users.sort(key=lambda u: u["total_points"], reverse=True)
        payload = {"users": users}
        #cache_set("leaderboard:individual", payload)
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== TEAM LEADERBOARD ====================
# Add this to your app.py

@app.route("/api/teams/leaderboard", methods=["GET"])
@token_required
def get_teams_leaderboard():
    """Get all teams with aggregated points from their members"""
    #cached = cache_get("leaderboard:teams")
    #if cached:
    #    return jsonify(cached)
    try:
        # Fetch all teams with their members' point fields
        response = supabase.table("teams").select(
            "id, name, has_space, looking_for, users(id, name, email, event_attendance_points, user_interaction_points)"
        ).execute()

        teams = response.data or []

        result = []
        for team in teams:
            members = team.get("users") or []
            total_event = sum(m.get("event_attendance_points") or 0 for m in members)
            total_social = sum(m.get("user_interaction_points") or 0 for m in members)
            result.append({
                "id": team["id"],
                "name": team["name"],
                "has_space": team.get("has_space"),
                "looking_for": team.get("looking_for"),
                "member_count": len(members),
                "total_event_points": total_event,
                "total_social_points": total_social,
                "total_points": total_event + total_social,
                "members": [
                    {
                        "id": m["id"],
                        "name": m.get("name"),
                        "email": m.get("email")
                    }
                    for m in members
                ],
            })

        result.sort(key=lambda t: t["total_points"], reverse=True)
        payload = {"teams": result}
        #cache_set("leaderboard:teams", payload)
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== TEAM INVITES ====================

@app.route("/api/team/<team_id>/invites", methods=["GET"])
@token_required
def get_team_invites(team_id):
    """Get all pending join requests for a team (owner only)"""
    try:
        response = (
            supabase.table("team_invites")
            .select("id, user_id, users(name, email)")
            .eq("team_id", team_id)
            .eq("status", "pending")
            .execute()
        )

        invites = []
        for row in response.data or []:
            user = row.get("users") or {}
            invites.append({
                "id": row["id"],
                "user_id": row["user_id"],
                "user_name": user.get("name", ""),
                "user_email": user.get("email", ""),
            })

        return jsonify({"invites": invites})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/team/<team_id>/invites", methods=["POST"])
@token_required
def request_join_team(team_id):
    """Send a join request to a team — upserts so users can re-apply after rejection"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "user_id is required"}), 400

        # Block if already pending
        existing = (
            supabase.table("team_invites")
            .select("id, status")
            .eq("team_id", team_id)
            .eq("user_id", user_id)
            .execute()
        )

        if existing.data:
            row = existing.data[0]
            if row["status"] == "pending":
                return jsonify({"error": "You already have a pending request for this team"}), 409
            # Re-apply after rejection: reset to pending
            response = (
                supabase.table("team_invites")
                .update({"status": "pending"})
                .eq("id", row["id"])
                .execute()
            )
            return jsonify({"invite": response.data[0]}), 200

        # No prior request — insert fresh
        response = supabase.table("team_invites").insert({
            "team_id": team_id,
            "user_id": user_id,
            "status": "pending",
        }).execute()

        return jsonify({"invite": response.data[0]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/team/<team_id>/invites/<invite_id>", methods=["PUT"])
@token_required
def respond_to_invite(team_id, invite_id):
    """Accept or reject a join request (team owner only)"""
    try:
        data = request.get_json()
        action = data.get("action")  # "accept" or "reject"

        if action not in ("accept", "reject"):
            return jsonify({"error": "action must be 'accept' or 'reject'"}), 400

        # Fetch the invite
        invite_res = (
            supabase.table("team_invites")
            .select("id, user_id, status")
            .eq("id", invite_id)
            .eq("team_id", team_id)
            .single()
            .execute()
        )

        if not invite_res.data:
            return jsonify({"error": "Invite not found"}), 404

        if invite_res.data["status"] != "pending":
            return jsonify({"error": "Invite already resolved"}), 409

        user_id = invite_res.data["user_id"]

        # Mark invite resolved
        supabase.table("team_invites").update({
            "status": "accepted" if action == "accept" else "rejected"
        }).eq("id", invite_id).execute()

        if action == "accept":
            # Add user to the team
            supabase.table("users").update({
                "team_id": team_id
            }).eq("id", user_id).execute()

            #increment member count
            supabase.rpc("increment_team_members", {"team_id": team_id}).execute()

            # Reject any other pending requests from this user on other teams
            supabase.table("team_invites").update({
                "status": "cancelled"
            }).eq("user_id", user_id).eq("status", "pending").execute()

        return jsonify({"success": True, "action": action})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== BOUNTIES ====================
@app.route("/api/bounties/<user_id>", methods=["GET"])
@token_required
def get_bounties(user_id):
    """Get all bounties with completion status for the current user"""
    try:
        bounties = supabase.table("bounties").select("*").execute().data or []

        completed_ids = {
            r["bounty_id"] for r in
            supabase.table("user_bounties")
            .select("bounty_id")
            .eq("user_id", user_id)
            .execute().data or []
        }

        for b in bounties:
            b["completed"] = b["id"] in completed_ids

        return jsonify({"bounties": bounties})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== RSVP ====================
@app.route("/api/user/<user_id>/rsvp", methods=["POST"])
@token_required
def update_rsvp(user_id):
    """Toggle a user's RSVP status (checked_rsvp true/false)"""
    try:
        data = request.get_json()
        checked_rsvp = data.get("checked_rsvp")

        if checked_rsvp is None or not isinstance(checked_rsvp, bool):
            return jsonify({"error": "checked_rsvp (boolean) is required"}), 400

        response = supabase.table("users") \
            .update({"checked_rsvp": checked_rsvp}) \
            .eq("id", user_id) \
            .execute()

        if not response.data:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"checked_rsvp": response.data[0]["checked_rsvp"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
