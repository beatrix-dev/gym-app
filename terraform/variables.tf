variable "project_id" {
  description = "GCP project ID (shared with other personal infra — gym-app gets its own VPC/cluster/DB within it)"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"

  validation {
    condition     = can(regex("^(us|europe|asia|northamerica|southamerica|australia)-[a-z]+[0-9]+$", var.region))
    error_message = "region must be a valid GCP region (e.g. us-central1, europe-west1)"
  }
}

variable "cluster_name" {
  description = "Name prefix applied to the cluster, VPC, and related resources"
  type        = string
  default     = "gym-tracker"
}

variable "repository_id" {
  description = "Artifact Registry repository ID for gym-app container images"
  type        = string
  default     = "gym-tracker"
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "authorized_network_cidr" {
  description = "CIDR (e.g. \"203.0.113.4/32\") allowed to reach the GKE control plane — set to the operator's current public IP before applying"
  type        = string
}

variable "labels" {
  description = "Labels applied to all resources"
  type        = map(string)
  default     = {}
}
