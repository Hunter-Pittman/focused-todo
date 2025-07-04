package api

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

// RateLimiter tracks requests per IP address
type RateLimiter struct {
	clients map[string]*ClientRate
	mutex   sync.RWMutex
	maxReqs int
	window  time.Duration
}

// ClientRate tracks rate limiting data for a client
type ClientRate struct {
	requests []time.Time
	mutex    sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxReqs int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		clients: make(map[string]*ClientRate),
		maxReqs: maxReqs,
		window:  window,
	}

	// Clean up old entries every minute
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			rl.cleanup()
		}
	}()

	return rl
}

// Allow checks if a request should be allowed
func (rl *RateLimiter) Allow(clientIP string) bool {
	rl.mutex.Lock()
	client, exists := rl.clients[clientIP]
	if !exists {
		client = &ClientRate{}
		rl.clients[clientIP] = client
	}
	rl.mutex.Unlock()

	client.mutex.Lock()
	defer client.mutex.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Remove old requests
	filtered := client.requests[:0]
	for _, req := range client.requests {
		if req.After(cutoff) {
			filtered = append(filtered, req)
		}
	}
	client.requests = filtered

	// Check if we're over the limit
	if len(client.requests) >= rl.maxReqs {
		return false
	}

	// Add this request
	client.requests = append(client.requests, now)
	return true
}

// cleanup removes old client entries
func (rl *RateLimiter) cleanup() {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	cutoff := time.Now().Add(-rl.window * 2)

	for ip, client := range rl.clients {
		client.mutex.Lock()
		hasRecentReqs := false
		for _, req := range client.requests {
			if req.After(cutoff) {
				hasRecentReqs = true
				break
			}
		}
		client.mutex.Unlock()

		if !hasRecentReqs {
			delete(rl.clients, ip)
		}
	}
}

// rateLimitMiddleware applies rate limiting
func (s *Server) rateLimitMiddleware(next http.Handler) http.Handler {
	// Create rate limiter: 100 requests per minute per IP
	rateLimiter := NewRateLimiter(100, time.Minute)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP := getClientIP(r)

		if !rateLimiter.Allow(clientIP) {
			s.writeError(w, http.StatusTooManyRequests, "Too many requests. Please try again later.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// bodySizeLimitMiddleware limits request body size
func (s *Server) bodySizeLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Limit request body to 10MB
		r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)

		next.ServeHTTP(w, r)
	})
}

// securityHeadersMiddleware adds security headers
func (s *Server) securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'")

		// CORS headers for Electron frontend
		origin := r.Header.Get("Origin")
		if isAllowedOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getClientIP extracts the client IP address from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// Take the first IP if there are multiple
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	ip := r.RemoteAddr
	if colonIndex := strings.LastIndex(ip, ":"); colonIndex != -1 {
		ip = ip[:colonIndex]
	}

	return ip
}

// isAllowedOrigin checks if an origin is allowed for CORS
func isAllowedOrigin(origin string) bool {
	allowedOrigins := []string{
		"http://localhost:5173", // Vite dev server
		"http://127.0.0.1:5173", // Alternative localhost
	}

	for _, allowed := range allowedOrigins {
		if origin == allowed {
			return true
		}
	}

	return false
}
