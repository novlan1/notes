package main

import "fmt"

func main() {
	users := map[string]string{
		"admin":  "admin",
		"editor": "editor",
		"viewer": "viewer",
		"guest":  "guest",
	}

	fmt.Println("roles")

	for role, desc := range users {
		fmt.Printf("%s: %s\n", role, desc)
	}
}
