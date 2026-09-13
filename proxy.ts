import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isSignIn = pathname.startsWith("/signin");
  const isSignedIn = Boolean(request.auth);

  if (!isSignedIn && !isSignIn) {
    return NextResponse.redirect(new URL("/signin", request.nextUrl));
  }

  if (isSignedIn && isSignIn) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
