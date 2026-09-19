export type AgentId = 
  | "agent_1_data_scout"
  | "agent_2_feature_forge"
  | "agent_3_predictive_oracle"
  | "agent_4_canvas_architect"
  | "orchestrator";

export type AgentState = "IDLE" | "THINKING" | "EXECUTING" | "COMPLETED" | "ERROR";

export interface AgentEvent {
  id: string;
  timestamp: number;
  agent_id: string;
  agent_name: string;
  event_type: string;
  message: string;
  details?: Record<string, any>;
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR";
}

export interface AgentMetadata {
  agent_id: string;
  name: string;
  role: string;
  description: string;
  avatar_icon: string;
  state: AgentState;
  execution_time_ms: number;
}

export interface PresetConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  target: string;
  default_samples: number;
}

export interface HistoricalDataPoint {
  index: number;
  timestamp: string;
  actual: number;
  predicted: number;
  residual: number;
  is_test_set: boolean;
}

export interface FutureForecastPoint {
  step: number;
  label: string;
  predicted: number;
  lower_bound_95: number;
  upper_bound_95: number;
  optimistic_scenario: number;
  pessimistic_scenario: number;
  uncertainty_range: number;
}

export interface FeatureImportance {
  feature: string;
  importance_score: number;
  formatted_name: string;
}

export interface ModelLeaderboardEntry {
  model_name: string;
  train_r2?: number;
  test_r2: number;
  train_rmse?: number;
  test_rmse: number;
  train_mae?: number;
  test_mae: number;
  test_mape_pct?: number;
  generalization_gap?: number;
  is_champion: boolean;
}

export interface KpiCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  badge: string;
  color: "emerald" | "cyan" | "violet" | "amber" | "rose";
  icon: string;
}

export interface Recommendation {
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  action: string;
  estimated_impact: string;
}

export interface AlertItem {
  id: string;
  severity: "WARNING" | "CAUTION" | "NORMAL";
  title: string;
  message: string;
}

export interface YoloDetectionItem {
  defect_type: string;
  confidence: number;
  bbox: [number, number, number, number];
  drs_score: number;
}

export interface AnnotatedFrameItem {
  frame_id: string;
  filename: string;
  timestamp_s: number;
  annotated_image_b64: string;
  detections: YoloDetectionItem[];
  frame_drs_score: number;
}

export interface YoloVisionPayload {
  model_architecture: string;
  weights: string;
  backbone: string;
  detection_head: string;
  precision_map50: number;
  inference_duration_ms: number;
  mean_latency_per_frame_ms: number;
  total_detections: number;
  class_counts: Record<string, number>;
  mean_confidence: number;
  annotated_frames: AnnotatedFrameItem[];
}

export interface PipelinePayload {
  domain: string;
  domain_title: string;
  target_column: string;
  raw_dataframe: Record<string, any>[];
  cleaned_dataframe?: Record<string, any>[];
  columns: string[];
  feature_columns?: string[];
  engineered_features?: string[];
  transformations?: { stage: string; method: string; details: string }[];
  original_missing?: number;
  remaining_missing?: number;
  raw_quality_score?: number;
  cleaned_quality_score?: number;
  quality_delta_pct?: number;
  correlation_matrix?: Record<string, Record<string, number>>;
  champion_model_name?: string;
  train_metrics?: { r2: number; rmse: number; mae: number };
  test_metrics?: { r2: number; rmse: number; mae: number; mape_pct?: number; generalization_gap?: number };
  training_samples_count?: number;
  test_samples_count?: number;
  leaderboard?: ModelLeaderboardEntry[];
  historical_series?: HistoricalDataPoint[];
  test_evaluation_series?: HistoricalDataPoint[];
  future_forecast?: FutureForecastPoint[];
  feature_importances?: FeatureImportance[];
  residual_distribution?: { bin_range: string; count: number; midpoint: number }[];
  residual_std?: number;
  xai_narrative?: string;
  forecast_horizon_steps?: number;
  yolo_vision?: YoloVisionPayload;
  executive_kpis?: KpiCard[];
  recommendations?: Recommendation[];
  alerts?: AlertItem[];
  team_metadata?: {
    total_duration_ms: number;
    agents: AgentMetadata[];
    event_count: number;
    timestamp: number;
  };
  status?: string;
}

export interface AuthorityItem {
  id: string;
  name: string;
  short_name: string;
  department: string;
  jurisdiction: string;
  nodal_officer: string;
  email: string;
  hotline: string;
  portal_url: string;
  sms_gateway: string;
  sla_emergency_hours: number;
  sla_high_hours: number;
}

export interface DispatchedAlertRecord {
  docket_id: string;
  defect_id: string;
  defect_type: string;
  severity_level: string;
  severity_score: number;
  risk_rating: string;
  road_name: string;
  nearby_landmark: string;
  segment_id: string;
  chainage_km: string;
  lat: number;
  lon: number;
  timestamp: string;
  recipient_authority: AuthorityItem;
  channel: string;
  status: "DISPATCHED" | "ACKNOWLEDGED" | "CREW_DEPLOYED" | "INSPECTION_SCHEDULED" | "REPAIR_COMPLETED";
  assigned_crew: string;
  sla_resolution_target: string;
  official_notice_text: string;
  confirmation_code: string;
}

export interface RoadDefectItem {
  defect_id: string;
  defect_type: string;
  rdd_code: string;
  category: string;
  confidence: number;
  bbox: number[];
  severity_level: "Low" | "Medium" | "High" | "Critical";
  severity_score: number;
  estimated_area_cm2: number;
  max_dimension_cm: number;
  estimated_depth_cm: number;
  xai_factors?: {
    cavity_depth_influence_pct: number;
    surface_area_influence_pct: number;
    structural_edge_sharpness_pct: number;
    moisture_water_ingress_pct: number;
    summary_narrative: string;
  };
  lat: number;
  lon: number;
  distance_m: number;
  segment_id: string;
  road_name?: string;
  nearby_landmark?: string;
  responsible_authority?: AuthorityItem | string;
  color_hex: string;
  impact_statement: string;
}

export interface RoadSegmentItem {
  segment_id: string;
  segment_index: number;
  start_distance_m: number;
  end_distance_m: number;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  road_name?: string;
  nearby_landmark?: string;
  sri_score: number;
  pci_score: number;
  condition_band: "Good" | "Moderate" | "Critical";
  band_color: string;
  status_text: string;
  defect_count: number;
  pothole_count: number;
  crack_count: number;
  water_count: number;
  defects: RoadDefectItem[];
  dominant_defect: string;
  speed_limit_kmh: number;
}

export interface RoadWorkOrderItem {
  work_order_id: string;
  defect_id?: string;
  segment_id: string;
  location: string;
  defect_type: string;
  severity_level: string;
  title: string;
  urgency: string;
  priority_rank: number;
  treatment: string;
  materials: string[];
  equipment: string[];
  estimated_cost_inr?: number;
  estimated_cost_usd?: number;
  crew_size: number;
}

export interface HistoricalTimelineItem {
  cycle: string;
  date: string;
  potholes_count: number;
  cracks_count: number;
  water_ponding_count: number;
  mean_sri: number;
  mean_pci: number;
  status: string;
  notes: string;
}

export interface RoadCorridor {
  id: string;
  name: string;
  road_name?: string;
  district: string;
  speed_limit_kmh: number;
  traffic_density: string;
  default_authority_id?: string;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  length_km: number;
}

export interface InspectionFrameItem {
  frame_id: string;
  filename: string;
  distance_m: number;
  lat: number;
  lon: number;
  segment_id: string;
  road_name?: string;
  nearby_landmark?: string;
  raw_image_b64?: string;
  annotated_image_b64: string;
  depth_heatmap_b64?: string;
  side_by_side_b64?: string;
  defect_count?: number;
  detections: RoadDefectItem[];
}

export interface FullRoadInspectionReport {
  corridor: RoadCorridor;
  summary: {
    total_inspected_distance_m: number;
    total_segments_count: number;
    total_defects_count: number;
    total_potholes: number;
    total_cracks: number;
    total_water_ponding: number;
    critical_segments_count: number;
    mean_route_sri: number;
    mean_route_pci: number;
    immediate_work_orders: number;
    total_estimated_budget_inr?: number;
    total_estimated_budget_usd?: number;
    yolo_inference_ms: number;
    mobilenet_severity_ms: number;
  };
  frames: InspectionFrameItem[];
  segments: RoadSegmentItem[];
  work_orders: RoadWorkOrderItem[];
  historical_timeline: HistoricalTimelineItem[];
  defect_taxonomy: Record<string, any>;
  authorities?: AuthorityItem[];
  dispatched_alerts?: DispatchedAlertRecord[];
}

export interface VideoKeyframeItem {
  frame_idx: number;
  timestamp_sec: number;
  defect_count: number;
  pothole_count: number;
  water_pothole_count: number;
  crack_count: number;
  overall_severity: "Normal" | "Warning" | "Critical";
  annotated_thumb_b64?: string;
  depth_thumb_b64?: string;
  status_banner: string;
  detections: any[];
  fix_protocol: any;
}

export interface VideoInspectionResult {
  video_filename: string;
  duration_sec: number;
  total_video_frames: number;
  sampled_frames_count: number;
  total_defects_count: number;
  total_potholes: number;
  total_water_potholes: number;
  total_cracks: number;
  worst_severity: string;
  total_estimated_budget_inr: number;
  total_estimated_budget_usd: number;
  processing_latency_ms: number;
  decision_verdict: {
    verdict_title: string;
    urgency_tier: string;
    action_code: string;
    sla_timeframe: string;
    engineering_rationale: string;
    immediate_procurement_directives: string[];
    tts_speech_text?: string;
  };
  bill_of_materials: {
    total_cost_inr: number;
    total_cost_usd: number;
    materials: any[];
    subtotal_materials_inr: number;
    subtotal_machinery_inr: number;
    subtotal_labor_inr: number;
    contingency_overhead_inr: number;
    compliance_standard: string;
  };
  work_order: {
    work_order_id: string;
    title: string;
    road_name: string;
    chainage_summary: string;
    jurisdiction_authority: string;
    urgency: string;
    primary_action: string;
    target_completion_days: number;
    total_cost_inr: number;
    total_cost_usd: number;
    created_at: string;
    status: string;
  };
  keyframes: VideoKeyframeItem[];
}

export interface MultiModalDecisionResponse {
  mode: string;
  is_comparative: boolean;
  delta_depth_cm: number;
  delta_potholes: number;
  is_accelerating: boolean;
  decision_verdict: {
    verdict_title: string;
    urgency_tier: string;
    sla_timeframe: string;
    engineering_rationale: string;
    action_code: string;
    tts_speech_text: string;
  };
  bill_of_materials: {
    repair_strategy: string;
    compliance_standard: string;
    total_cost_inr: number;
    total_cost_usd: number;
    materials: any[];
  };
  work_order: {
    work_order_id: string;
    title: string;
    urgency: string;
    sla_timeframe: string;
    estimated_cost_inr: number;
    estimated_cost_usd: number;
    created_at: string;
    status: string;
  };
}

export interface BenchmarkSampleMedia {
  filename: string;
  title: string;
  category: string;
  image_b64: string;
}

export interface SampleMediaResponse {
  benchmark_images: BenchmarkSampleMedia[];
  has_sample_video: boolean;
  sample_video_path?: string;
}

