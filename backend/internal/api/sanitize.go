package api

import (
	"html"
	"regexp"
	"strings"
)

var (
	// Regex patterns for sanitization
	scriptTagRegex = regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`)
	htmlTagRegex   = regexp.MustCompile(`<[^>]*>`)
	sqlKeywords    = regexp.MustCompile(`(?i)\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|OR|AND|EXEC|EXECUTE)\b`)
)

// sanitizeInput sanitizes user input to prevent XSS and injection attacks
func sanitizeInput(input string) string {
	if input == "" {
		return input
	}

	// Trim whitespace
	sanitized := strings.TrimSpace(input)

	// HTML escape to prevent XSS
	sanitized = html.EscapeString(sanitized)

	// Remove any remaining script tags (double protection)
	sanitized = scriptTagRegex.ReplaceAllString(sanitized, "")

	// Remove HTML tags
	sanitized = htmlTagRegex.ReplaceAllString(sanitized, "")

	// Remove common SQL injection keywords (basic protection)
	sanitized = sqlKeywords.ReplaceAllStringFunc(sanitized, func(match string) string {
		return strings.Repeat("*", len(match))
	})

	// Remove null bytes and other control characters
	sanitized = strings.ReplaceAll(sanitized, "\x00", "")
	sanitized = strings.ReplaceAll(sanitized, "\r", "")

	// Limit length to prevent memory exhaustion
	const maxLength = 10000
	if len(sanitized) > maxLength {
		sanitized = sanitized[:maxLength]
	}

	return sanitized
}

// sanitizeProjectName sanitizes project names with specific rules
func sanitizeProjectName(name string) string {
	sanitized := sanitizeInput(name)

	// Additional rules for project names
	// Remove leading/trailing dots and spaces
	sanitized = strings.Trim(sanitized, ". ")

	// Replace multiple spaces with single space
	spaceRegex := regexp.MustCompile(`\s+`)
	sanitized = spaceRegex.ReplaceAllString(sanitized, " ")

	return sanitized
}

// sanitizeTaskTitle sanitizes task titles
func sanitizeTaskTitle(title string) string {
	sanitized := sanitizeInput(title)

	// Replace multiple spaces with single space
	spaceRegex := regexp.MustCompile(`\s+`)
	sanitized = spaceRegex.ReplaceAllString(sanitized, " ")

	return sanitized
}

// sanitizeDescription sanitizes descriptions (more permissive)
func sanitizeDescription(description string) string {
	if description == "" {
		return description
	}

	// Trim whitespace
	sanitized := strings.TrimSpace(description)

	// HTML escape for safety
	sanitized = html.EscapeString(sanitized)

	// Remove script tags but allow some basic formatting
	sanitized = scriptTagRegex.ReplaceAllString(sanitized, "")

	// Remove SQL injection keywords
	sanitized = sqlKeywords.ReplaceAllStringFunc(sanitized, func(match string) string {
		return strings.Repeat("*", len(match))
	})

	// Remove null bytes
	sanitized = strings.ReplaceAll(sanitized, "\x00", "")

	// Limit length
	const maxLength = 50000 // Longer limit for descriptions
	if len(sanitized) > maxLength {
		sanitized = sanitized[:maxLength]
	}

	return sanitized
}

// validateColor checks if a color string is a valid hex color
func validateColor(color string) bool {
	if color == "" {
		return false
	}

	// Must start with # and be 7 characters total
	if len(color) != 7 || color[0] != '#' {
		return false
	}

	// Check if remaining characters are valid hex
	hexRegex := regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)
	return hexRegex.MatchString(color)
}

// validateIcon checks if an icon string is safe
func validateIcon(icon string) bool {
	if icon == "" {
		return false
	}

	// Only allow alphanumeric characters, hyphens, and underscores
	iconRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	return iconRegex.MatchString(icon) && len(icon) <= 50
}
