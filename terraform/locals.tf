locals {
  zone = "${var.region}-a"

  common_labels = merge(var.labels, {
    managed-by = "terraform"
    app        = "gym-tracker"
  })

  # Namespace/ServiceAccount names must match k8s/backend.yaml — the Workload
  # Identity binding below is keyed on this exact "<namespace>/<ksa-name>" pair.
  k8s_namespace               = "gym-tracker"
  backend_k8s_service_account = "gym-app-backend"
}
