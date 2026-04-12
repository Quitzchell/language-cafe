.PHONY: up down dev build install lint logs logs-app logs-db reset-db studio shell clean

# Start all services in the background
up:
	docker compose up -d

# Stop all services
down:
	docker compose down

# Start all services with logs attached
dev:
	docker compose up

# Rebuild containers (use after Dockerfile changes)
build:
	docker compose build

# Install npm dependencies inside the app container
install:
	docker compose run --rm app npm install

# Run linter
lint:
	docker compose run --rm app npm run lint

# Show logs for all services
logs:
	docker compose logs -f

# Show logs for specific services
logs-app:
	docker compose logs -f app

logs-db:
	docker compose logs -f supabase-db

# Reset the Supabase database (destroys all data)
reset-db:
	docker compose down -v supabase-db
	docker compose up -d supabase-db

# Open Supabase Studio in browser
studio:
	@echo "Supabase Studio: http://localhost:3001"

# Open a shell in the app container
shell:
	docker compose exec app sh

# Remove all containers, volumes, and built images
clean:
	docker compose down -v --rmi local