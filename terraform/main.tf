# ---------------------------------------------------------------------------
# Shared modules, pinned to a tagged release of infrastructure-terraform-gcp
# (github.com/beatrix-dev/infrastructure-terraform-gcp) rather than `main`.
# ---------------------------------------------------------------------------
locals {
  modules_source = "git::https://github.com/beatrix-dev/infrastructure-terraform-gcp.git"
  modules_ref    = "v1.0.1"
}

# ---------------------------------------------------------------------------
# VPC — dedicated to gym-app, own CIDR ranges to avoid colliding with other
# infra already running in this project (which uses 10.0/10.1/10.2).
# ---------------------------------------------------------------------------
module "vpc" {
  source = "${local.modules_source}//modules/vpc?ref=${local.modules_ref}"

  name_prefix = var.cluster_name
  project_id  = var.project_id
  gcp_region  = var.region
  labels      = local.common_labels

  vpc_config = {
    network_name        = "${var.cluster_name}-vpc"
    subnet_cidr         = "10.10.0.0/24"
    pods_cidr           = "10.11.0.0/16"
    services_cidr       = "10.12.0.0/20"
    pods_range_name     = "pods"
    services_range_name = "services"
    enable_nat          = true
    nat_log_filter      = "ERRORS_ONLY"
  }
}

# ---------------------------------------------------------------------------
# GKE — private nodes, public endpoint restricted to the operator's IP.
# ---------------------------------------------------------------------------
module "gke" {
  source = "${local.modules_source}//modules/gke?ref=${local.modules_ref}"

  name_prefix         = var.cluster_name
  project_id          = var.project_id
  gcp_location        = local.zone
  network_id          = module.vpc.network_id
  subnetwork_id       = module.vpc.subnetwork_id
  pods_range_name     = "pods"
  services_range_name = "services"
  labels              = local.common_labels

  cluster_config = {
    name                    = var.cluster_name
    release_channel         = "REGULAR"
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
    master_authorized_networks = [
      {
        cidr_block   = var.authorized_network_cidr
        display_name = "operator"
      }
    ]
    deletion_protection = false
  }

  depends_on = [module.vpc]
}

# ---------------------------------------------------------------------------
# Artifact Registry — backend/frontend images.
# ---------------------------------------------------------------------------
module "container_registry" {
  source = "${local.modules_source}//modules/container-registry?ref=${local.modules_ref}"

  project_id    = var.project_id
  repository_id = var.repository_id
  location      = var.region
  description   = "Container images for ${var.cluster_name}"
}

# ---------------------------------------------------------------------------
# Cloud SQL — public IP, but locked to SSL-only with no authorized networks.
# The backend reaches it exclusively through a Cloud SQL Auth Proxy sidecar,
# authenticated via Workload Identity (see the IAM bindings below), so no
# network-level allowlist or static credential key is needed.
# ---------------------------------------------------------------------------
module "database" {
  source = "${local.modules_source}//modules/database?ref=${local.modules_ref}"

  database_config = {
    name                = "gym_tracker"
    instance_name       = "${var.cluster_name}-db"
    location            = var.region
    version             = "MYSQL_8_0"
    tier                = var.db_tier
    edition             = "ENTERPRISE"
    availability_type   = "ZONAL"
    deletion_protection = false

    ip_configuration = {
      ipv4_enabled        = true
      require_ssl         = true
      authorized_networks = []
    }
  }
}

# ---------------------------------------------------------------------------
# Workload Identity — lets the backend pod's Kubernetes ServiceAccount act as
# this GCP service account, so the Cloud SQL Auth Proxy sidecar can
# authenticate without a downloaded key file.
# ---------------------------------------------------------------------------
resource "google_service_account" "backend" {
  account_id   = "${var.cluster_name}-backend-sa"
  display_name = "gym-app backend workload identity SA"
  project      = var.project_id
}

resource "google_project_iam_member" "backend_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_service_account_iam_member" "backend_workload_identity" {
  service_account_id = google_service_account.backend.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${local.k8s_namespace}/${local.backend_k8s_service_account}]"
}
