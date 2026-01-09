/**
 * Dashboard Page
 * 
 * Main app page shown after user signs up or signs in.
 * Contains navigation to request rides and view carpools.
 * 
 * AUTHENTICATION PROTECTION:
 * - This page requires user to be authenticated (signed in)
 * - On page load, checks if user has valid session
 * - If not authenticated: redirects to sign in page
 * - If authenticated: shows dashboard with Request and Carpool buttons
 * 
 * MVP:
 *   - Client-side session check on page load
 *   - Basic redirect if not authenticated
 * 
 * Production:
 *   - Use Next.js middleware for route protection (more secure)
 *   - Server-side session validation
 *   - Add loading states during authentication check
 *   - Cache session check to avoid repeated API calls
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequestButton from "@/components/requestbutton";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  
  // State to track authentication check
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking, true = authenticated, false = not authenticated
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check if user is authenticated
   * 
   * FLOW:
   * 1. Call session API endpoint to check if user has valid session
   * 2. Session API checks cookie/header for session token
   * 3. If valid session exists: user is authenticated
   * 4. If no session or invalid: user is not authenticated
   * 
   * MVP: Client-side check on page load
   * Production: Use server-side middleware for better security
   */
  useEffect(() => {
    async function checkAuthentication() {
      try {
        // Get session token from localStorage (MVP) or cookie (Production)
        // MVP: We stored session token in localStorage during sign in
        // Production: Session token should be in httpOnly cookie (not accessible to JavaScript)
        const sessionToken = localStorage.getItem("sessionToken");

        // If no session token in localStorage, check cookie via API
        // The API will check cookies automatically
        const res = await fetch("/api/auth/session", {
          method: "GET",
          headers: sessionToken
            ? {
                // MVP: Send token in Authorization header if found in localStorage
                Authorization: `Bearer ${sessionToken}`,
              }
            : {},
        });

        if (res.ok) {
          // User is authenticated - session is valid
          setIsAuthenticated(true);
        } else {
          // User is not authenticated - no valid session
          setIsAuthenticated(false);
          
          // Clear any invalid session token from localStorage
          localStorage.removeItem("sessionToken");
          
          // Redirect to sign in page
          router.push("/signin");
        }
      } catch (error) {
        // Error checking session - treat as not authenticated
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
        localStorage.removeItem("sessionToken");
        router.push("/signin");
      } finally {
        setIsLoading(false);
      }
    }

    // Check authentication when component mounts
    checkAuthentication();
  }, [router]);

  /**
   * Show loading state while checking authentication
   * 
   * MVP: Simple loading message
   * Production: Add proper loading spinner/skeleton
   */
  if (isLoading) {
    return (
      <main className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </main>
    );
  }

  /**
   * If not authenticated, don't render dashboard
   * (User will be redirected by useEffect)
   * 
   * This is a safety check in case redirect doesn't happen immediately
   */
  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  /**
   * User is authenticated - show dashboard
   * 
   * This contains the main navigation for authenticated users:
   * - RequestButton: Opens modal to request rides (immediate, scheduled, group)
   * - Carpools link: Navigate to carpool feed page
   */
  return (
    <main className="p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {/* Request Button - Opens modal with ride request options */}
          <RequestButton />
          
          {/* Carpools Link - Navigate to carpool listings */}
          <Link
            href="/carpool/feed"
            className="rounded-xl px-4 py-2 font-medium shadow-sm border border-neutral-200 bg-white hover:bg-neutral-50"
          >
            Carpools
          </Link>
        </div>
      </div>
    </main>
  );
}
