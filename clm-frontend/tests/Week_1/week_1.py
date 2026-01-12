import os
import sys
import django
import json
import time
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clm_backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from authentication.otp_service import OTPService

User = get_user_model()
client = Client()

BASE_URL = "http://localhost:8000/api/auth"
TEST_EMAIL = "test_auth_user@example.com"
TEST_PASSWORD = "TestPassword123!"
TEST_FULL_NAME = "Test User"

# ANSI colors for output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}")
    print(f"{title}")
    print(f"{'='*80}{Colors.ENDC}\n")

def print_test(test_name, passed, response_data=None, error=None):
    """Print test result"""
    status = f"{Colors.OKGREEN}✓ PASS{Colors.ENDC}" if passed else f"{Colors.FAIL}✗ FAIL{Colors.ENDC}"
    print(f"{status} - {test_name}")
    if response_data:
        print(f"  Response: {json.dumps(response_data, indent=2)}")
    if error:
        print(f"  Error: {error}")

def print_info(message):
    """Print info message"""
    print(f"{Colors.OKCYAN}ℹ {message}{Colors.ENDC}")

def cleanup_test_user():
    """Delete test user if exists"""
    try:
        User.objects.filter(email=TEST_EMAIL).delete()
        print_info("Cleaned up previous test user")
    except:
        pass

# Test 1: Register User
def test_register():
    """Test user registration"""
    print_section("TEST 1: USER REGISTRATION")
    
    cleanup_test_user()
    
    response = client.post(
        '/api/auth/register/',
        data={
            'email': TEST_EMAIL,
            'password': TEST_PASSWORD,
            'full_name': TEST_FULL_NAME
        },
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 201
    print_test("User Registration", passed, response_data)
    
    if passed:
        print_info(f"✓ Access token generated: {response_data.get('access')[:50]}...")
        print_info(f"✓ Refresh token generated: {response_data.get('refresh')[:50]}...")
        print_info(f"✓ User ID: {response_data.get('user', {}).get('user_id')}")
        print_info(f"✓ Email: {response_data.get('user', {}).get('email')}")
    
    return passed, response_data


# Test 2: Login with Email and Password
def test_login():
    """Test user login"""
    print_section("TEST 2: USER LOGIN")
    
    response = client.post(
        '/api/auth/login/',
        data={
            'email': TEST_EMAIL,
            'password': TEST_PASSWORD
        },
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("User Login", passed, response_data)
    
    if passed:
        print_info(f"✓ Access token: {response_data.get('access')[:50]}...")
        print_info(f"✓ Refresh token: {response_data.get('refresh')[:50]}...")
        print_info(f"✓ User email: {response_data.get('user', {}).get('email')}")
    
    return passed, response_data


# Test 3: Get Current User (Authenticated)
def test_get_current_user(access_token):
    """Test getting current user profile"""
    print_section("TEST 3: GET CURRENT USER")
    
    headers = {'Authorization': f'Bearer {access_token}'}
    response = client.get(
        '/api/auth/me/',
        HTTP_AUTHORIZATION=f'Bearer {access_token}'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("Get Current User", passed, response_data)
    
    if passed:
        print_info(f"✓ User ID: {response_data.get('user_id')}")
        print_info(f"✓ Email: {response_data.get('email')}")
        print_info(f"✓ Tenant ID: {response_data.get('tenant_id')}")
    
    return passed, response_data


# Test 4: Refresh Token
def test_refresh_token(refresh_token):
    """Test token refresh"""
    print_section("TEST 4: REFRESH TOKEN")
    
    response = client.post(
        '/api/auth/refresh/',
        data={'refresh': refresh_token},
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("Refresh Token", passed, response_data)
    
    if passed:
        print_info(f"✓ New access token: {response_data.get('access')[:50]}...")
        new_token = response_data.get('access')
    else:
        new_token = None
    
    return passed, response_data, new_token


# Test 5: Request Login OTP
def test_request_login_otp():
    """Test requesting login OTP"""
    print_section("TEST 5: REQUEST LOGIN OTP")
    
    response = client.post(
        '/api/auth/request-login-otp/',
        data={'email': TEST_EMAIL},
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("Request Login OTP", passed, response_data)
    
    if passed:
        print_info(f"✓ Message: {response_data.get('message')}")
        # Get the OTP from database for testing
        user = User.objects.get(email=TEST_EMAIL)
        if user.login_otp:
            print_info(f"✓ OTP generated: {user.login_otp}")
            return passed, response_data, user.login_otp
    
    return passed, response_data, None


# Test 6: Verify Email OTP
def test_verify_email_otp(otp):
    """Test verifying email OTP"""
    print_section("TEST 6: VERIFY EMAIL OTP")
    
    if not otp:
        print_test("Verify Email OTP", False, error="No OTP available from previous step")
        return False, None, None
    
    response = client.post(
        '/api/auth/verify-email-otp/',
        data={
            'email': TEST_EMAIL,
            'otp': otp
        },
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("Verify Email OTP", passed, response_data)
    
    if passed:
        access_token = response_data.get('access')
        print_info(f"✓ Access token: {access_token[:50]}...")
        return passed, response_data, access_token
    
    return passed, response_data, None


# Test 7: Forgot Password
def test_forgot_password():
    """Test forgot password flow"""
    print_section("TEST 7: FORGOT PASSWORD")
    
    response = client.post(
        '/api/auth/forgot-password/',
        data={'email': TEST_EMAIL},
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("Forgot Password", passed, response_data)
    
    if passed:
        print_info(f"✓ Message: {response_data.get('message')}")
        # Get the reset OTP from database
        user = User.objects.get(email=TEST_EMAIL)
        if user.password_reset_otp:
            print_info(f"✓ Password reset OTP: {user.password_reset_otp}")
            return passed, response_data, user.password_reset_otp
    
    return passed, response_data, None


# Test 8: Verify Password Reset OTP
def test_verify_password_reset_otp(otp):
    """Test verifying password reset OTP"""
    print_section("TEST 8: VERIFY PASSWORD RESET OTP")
    
    if not otp:
        print_test("Verify Password Reset OTP", False, error="No OTP available")
        return False, None, None
    
    response = client.post(
        '/api/auth/verify-password-reset-otp/',
        data={
            'email': TEST_EMAIL,
            'otp': otp
        },
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("Verify Password Reset OTP", passed, response_data)
    
    if passed:
        token = response_data.get('reset_token')
        print_info(f"✓ Reset token: {token[:50] if token else 'N/A'}...")
        return passed, response_data, token
    
    return passed, response_data, None


# Test 9: Resend Password Reset OTP
def test_resend_password_reset_otp():
    """Test resending password reset OTP"""
    print_section("TEST 9: RESEND PASSWORD RESET OTP")
    
    response = client.post(
        '/api/auth/resend-password-reset-otp/',
        data={'email': TEST_EMAIL},
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("Resend Password Reset OTP", passed, response_data)
    
    if passed:
        print_info(f"✓ Message: {response_data.get('message')}")
        user = User.objects.get(email=TEST_EMAIL)
        if user.password_reset_otp:
            print_info(f"✓ New OTP: {user.password_reset_otp}")
            return passed, response_data, user.password_reset_otp
    
    return passed, response_data, None


# Test 10: Logout
def test_logout(access_token):
    """Test user logout"""
    print_section("TEST 10: LOGOUT")
    
    response = client.post(
        '/api/auth/logout/',
        HTTP_AUTHORIZATION=f'Bearer {access_token}'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 200
    print_test("Logout", passed, response_data)
    
    if passed:
        print_info(f"✓ Message: {response_data.get('message')}")
    
    return passed, response_data


# Test 11: Invalid Credentials
def test_invalid_credentials():
    """Test login with invalid credentials"""
    print_section("TEST 11: INVALID CREDENTIALS")
    
    response = client.post(
        '/api/auth/login/',
        data={
            'email': TEST_EMAIL,
            'password': 'WrongPassword123!'
        },
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 401
    print_test("Invalid Credentials Returns 401", passed, response_data)
    
    return passed, response_data


# Test 12: Missing Required Fields
def test_missing_fields():
    """Test registration with missing fields"""
    print_section("TEST 12: MISSING REQUIRED FIELDS")
    
    response = client.post(
        '/api/auth/register/',
        data={'email': TEST_EMAIL},
        content_type='application/json'
    )
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json()
    
    passed = response.status_code == 400
    print_test("Missing Password Returns 400", passed, response_data)
    
    return passed, response_data


# Test 13: Unauthorized Access
def test_unauthorized_access():
    """Test accessing protected endpoint without token"""
    print_section("TEST 13: UNAUTHORIZED ACCESS")
    
    response = client.get('/api/auth/me/')
    
    print(f"Status Code: {response.status_code}")
    response_data = response.json() if response.status_code != 401 else {"error": "Unauthorized"}
    
    passed = response.status_code == 401
    print_test("Protected Endpoint Returns 401 Without Token", passed, response_data)
    
    return passed, response_data


# Main execution
def main():
    print(f"{Colors.BOLD}{Colors.HEADER}")
    print("╔" + "="*78 + "╗")
    print("║" + " "*15 + "COMPLETE AUTHENTICATION FLOW TEST SUITE" + " "*24 + "║")
    print("║" + " "*78 + "║")
    print("║" + f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}" + " "*46 + "║")
    print("╚" + "="*78 + "╝")
    print(f"{Colors.ENDC}\n")
    
    results = {}
    
    try:
        # Test 1: Register
        passed, reg_data = test_register()
        results['Register'] = passed
        access_token = reg_data.get('access') if passed else None
        refresh_token = reg_data.get('refresh') if passed else None
        
        # Test 2: Login
        passed, login_data = test_login()
        results['Login'] = passed
        if passed:
            access_token = login_data.get('access')
            refresh_token = login_data.get('refresh')
        
        # Test 3: Get Current User
        if access_token:
            passed, _ = test_get_current_user(access_token)
            results['Get Current User'] = passed
        
        # Test 4: Refresh Token
        if refresh_token:
            passed, _, new_token = test_refresh_token(refresh_token)
            results['Refresh Token'] = passed
            if new_token:
                access_token = new_token
        
        # Test 5: Request Login OTP
        passed, _, login_otp = test_request_login_otp()
        results['Request Login OTP'] = passed
        
        # Test 6: Verify Email OTP
        if login_otp:
            passed, _, otp_access = test_verify_email_otp(login_otp)
            results['Verify Email OTP'] = passed
        
        # Test 7: Forgot Password
        passed, _, forgot_otp = test_forgot_password()
        results['Forgot Password'] = passed
        
        # Test 8: Verify Password Reset OTP
        if forgot_otp:
            passed, _, reset_token = test_verify_password_reset_otp(forgot_otp)
            results['Verify Password Reset OTP'] = passed
        
        # Test 9: Resend Password Reset OTP
        passed, _, _ = test_resend_password_reset_otp()
        results['Resend Password Reset OTP'] = passed
        
        # Test 10: Logout
        if access_token:
            passed, _ = test_logout(access_token)
            results['Logout'] = passed
        
        # Test 11: Invalid Credentials
        passed, _ = test_invalid_credentials()
        results['Invalid Credentials'] = passed
        
        # Test 12: Missing Fields
        cleanup_test_user()  # Clean before next test
        passed, _ = test_missing_fields()
        results['Missing Fields'] = passed
        
        # Test 13: Unauthorized Access
        passed, _ = test_unauthorized_access()
        results['Unauthorized Access'] = passed
        
    except Exception as e:
        print(f"{Colors.FAIL}ERROR: {str(e)}{Colors.ENDC}")
        import traceback
        traceback.print_exc()
    
    # Print Summary
    print_section("SUMMARY")
    total_tests = len(results)
    passed_tests = sum(1 for v in results.values() if v)
    failed_tests = total_tests - passed_tests
    
    for test_name, passed in results.items():
        status = f"{Colors.OKGREEN}✓{Colors.ENDC}" if passed else f"{Colors.FAIL}✗{Colors.ENDC}"
        print(f"{status} {test_name}")
    
    print(f"\n{Colors.BOLD}Total: {total_tests} | Passed: {Colors.OKGREEN}{passed_tests}{Colors.ENDC} | Failed: {Colors.FAIL}{failed_tests}{Colors.ENDC}{Colors.ENDC}")
    
    if failed_tests == 0:
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}✓ ALL TESTS PASSED!{Colors.ENDC}")
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}✗ {failed_tests} TEST(S) FAILED!{Colors.ENDC}")
    
    # Cleanup
    cleanup_test_user()
    
    return failed_tests == 0


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
