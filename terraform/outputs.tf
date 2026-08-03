output "cluster_name" {
  description = "GKE cluster name"
  value       = module.gke.cluster_name
}

output "cluster_endpoint" {
  description = "GKE API server endpoint (without https://)"
  value       = module.gke.cluster_endpoint
}

output "cluster_ca_certificate" {
  description = "Base64-encoded cluster CA certificate"
  value       = module.gke.cluster_ca_certificate
  sensitive   = true
}

output "workload_identity_pool" {
  description = "Workload Identity pool identifier"
  value       = module.gke.workload_identity_pool
}

output "node_service_account_email" {
  description = "Email of the GKE node service account"
  value       = module.gke.node_service_account_email
}

output "backend_service_account_email" {
  description = "Email of the backend workload's GCP service account (bound via Workload Identity)"
  value       = google_service_account.backend.email
}

output "artifact_registry_repository_url" {
  description = "Docker pull/push URL prefix for gym-app images"
  value       = module.container_registry.repository_url
}

output "db_connection_name" {
  description = "Cloud SQL instance connection name (project:region:instance) — used by the Cloud SQL Auth Proxy"
  value       = module.database.connection_name
}

output "db_instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = module.database.instance_name
}
