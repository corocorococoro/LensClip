<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuthIdentity;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect to Google OAuth.
     */
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')
            ->scopes(['openid', 'email', 'profile'])
            ->redirect();
    }

    /**
     * Handle callback from Google OAuth.
     */
    public function callback(Request $request): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            Log::error('Google OAuth callback failed', ['error' => $e->getMessage()]);
            return redirect()->route('login')
                ->with('error', 'Google認証に失敗しました。');
        }

        // Extract OIDC claims
        $issuer = 'https://accounts.google.com';
        $subject = $googleUser->getId();
        $email = $googleUser->getEmail();
        $name = $googleUser->getName();

        Log::info('Google OAuth callback', [
            'sub' => $subject,
            'email' => $email,
        ]);

        // Case A: (iss, sub) already exists -> Login
        $identity = AuthIdentity::findByOidc('google', $issuer, $subject);
        if ($identity) {
            Auth::login($identity->user, true);
            return redirect()->intended('/dashboard');
        }

        // Case B: Email matches existing user -> Need confirmation
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            // Store Google info in session for linking
            $request->session()->put('google_link', [
                'issuer' => $issuer,
                'subject' => $subject,
                'email' => $email,
                'name' => $name,
                'user_id' => $existingUser->id,
            ]);

            return redirect()->route('auth.google.link');
        }

        // Case C: New user -> Create and login
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => null, // No password for OAuth users
            'email_verified_at' => now(), // Google verified the email
        ]);

        AuthIdentity::create([
            'user_id' => $user->id,
            'provider' => 'google',
            'issuer' => $issuer,
            'subject' => $subject,
            'email_at_link' => $email,
        ]);

        Log::info('New user created via Google OAuth', ['user_id' => $user->id]);

        Auth::login($user, true);
        return redirect()->intended('/dashboard');
    }

    /**
     * Show the link confirmation page.
     */
    public function showLinkForm(Request $request): Response|RedirectResponse
    {
        $googleLink = $request->session()->get('google_link');

        if (!$googleLink) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/GoogleLinkConfirm', [
            'email' => $googleLink['email'],
        ]);
    }

    /**
     * Process the link confirmation.
     */
    public function processLink(Request $request): RedirectResponse
    {
        $googleLink = $request->session()->get('google_link');

        if (!$googleLink) {
            return redirect()->route('login')
                ->with('error', 'セッションが期限切れです。');
        }

        $request->validate([
            'password' => 'required|string',
        ]);

        $user = User::find($googleLink['user_id']);

        if (!$user || !Hash::check($request->password, $user->password)) {
            return back()->withErrors([
                'password' => 'パスワードが正しくありません。',
            ]);
        }

        // Create the identity link
        AuthIdentity::create([
            'user_id' => $user->id,
            'provider' => 'google',
            'issuer' => $googleLink['issuer'],
            'subject' => $googleLink['subject'],
            'email_at_link' => $googleLink['email'],
        ]);

        // Clear session
        $request->session()->forget('google_link');

        Log::info('Google account linked to existing user', ['user_id' => $user->id]);

        Auth::login($user, true);
        return redirect()->intended('/dashboard');
    }
}
