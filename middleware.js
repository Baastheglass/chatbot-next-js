import { NextResponse, userAgent } from 'next/server'
 
export function middleware(request) {
  const url = request.nextUrl
  
  const useragent= userAgent(request)
  const response = NextResponse.rewrite(url);
  response.cookies.set("user-agent", useragent.ua, { path: "/" });

  return response;

}