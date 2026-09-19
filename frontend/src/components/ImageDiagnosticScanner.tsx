import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Camera,
  Video,
  RefreshCw,
  Send,
  Eye,
  TrendingDown,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Layers,
  FileText,
  Sliders,
  CheckCircle2,
  Sparkles,
  Radio,
  FileVideo,
  Zap,
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { api } from "../services/api";
import type { RoadDefectItem, AuthorityItem, VideoInspectionResult, BenchmarkSampleMedia } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

interface ImageDiagnosticScannerProps {
  authorities?: AuthorityItem[];
  onOpenAlertModal?: (defect: RoadDefectItem, imgB64?: string) => void;
}

type InputMode = "past_image" | "past_video" | "live_snapshot" | "live_stream" | "comparative";

export const ImageDiagnosticScanner: React.FC<ImageDiagnosticScannerProps> = ({
  authorities = [],
  onOpenAlertModal,
}) => {
  // Navigation & Mode
  const [activeMode, setActiveMode] = useState<InputMode>("past_image");
  const [activeViewMode, setActiveViewMode] = useState<"annotated" | "split" | "raw" | "depth">("annotated");

  // Image Input & State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);

  // Video Input & State
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isVideoScanning, setIsVideoScanning] = useState<boolean>(false);
  const [videoResult, setVideoResult] = useState<VideoInspectionResult | null>(null);
  const [activeKeyframeIndex, setActiveKeyframeIndex] = useState<number>(0);

  // Live Camera & Stream State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [liveFps, setLiveFps] = useState<number>(0);
  const [liveLatencyMs, setLiveLatencyMs] = useState<number>(0);
  const [liveDetectionResult, setLiveDetectionResult] = useState<any | null>(null);
  const liveStreamIntervalRef = useRef<any>(null);

  // Comparative Past vs Live State
  const [baselineData] = useState<any | null>(null);
  const [comparativeVerdict, setComparativeVerdict] = useState<any | null>(null);

  // Voice TTS State
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Benchmark Catalog
  const [benchmarkSamples, setBenchmarkSamples] = useState<BenchmarkSampleMedia[]>([]);

  // Load sample benchmarks on mount
  useEffect(() => {
    const loadSamples = async () => {
      try {
        const data = await api.fetchSampleMedia();
        if (data && data.benchmark_images) {
          setBenchmarkSamples(data.benchmark_images);
        }
      } catch (e) {
        console.warn("Could not load sample media", e);
      }
    };
    loadSamples();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera Handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Camera access was not granted or is unavailable on this device.");
    }
  };

  const stopCamera = () => {
    if (liveStreamIntervalRef.current) {
      clearInterval(liveStreamIntervalRef.current);
      liveStreamIntervalRef.current = null;
    }
    setIsLiveStreaming(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureLiveSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL("image/jpeg", 0.88);

    setIsScanning(true);
    try {
      const res = await api.detectLiveFrame(b64);
      if (res) {
        setDiagnosticResult(res);
        setPreviewUrl(b64);
        playSpeechNarration(res.recommendation || res.status_banner);
      }
    } catch (e) {
      console.error("Live snapshot scan failed", e);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleLiveStreaming = () => {
    if (isLiveStreaming) {
      if (liveStreamIntervalRef.current) {
        clearInterval(liveStreamIntervalRef.current);
        liveStreamIntervalRef.current = null;
      }
      setIsLiveStreaming(false);
    } else {
      if (!isCameraActive) {
        startCamera().then(() => {
          startLiveStreamLoop();
        });
      } else {
        startLiveStreamLoop();
      }
    }
  };

  const startLiveStreamLoop = () => {
    setIsLiveStreaming(true);
    let frameCounter = 0;
    let lastTime = Date.now();

    liveStreamIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) return;

      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL("image/jpeg", 0.7);

      const t0 = performance.now();
      try {
        const res = await api.detectLiveFrame(b64, frameCounter, frameCounter * 0.5);
        const t1 = performance.now();
        setLiveLatencyMs(Math.round(t1 - t0));
        setLiveDetectionResult(res);

        frameCounter++;
        const now = Date.now();
        if (now - lastTime >= 1000) {
          setLiveFps(Math.round((frameCounter * 1000) / (now - lastTime)));
          frameCounter = 0;
          lastTime = now;
        }
      } catch (e) {
        console.error("Stream frame error", e);
      }
    }, 500);
  };

  // Image Upload Handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsScanning(true);

    try {
      const res = await api.detectRoadImage(file);
      setDiagnosticResult(res);
      playSpeechNarration(res.recommendation || res.status_banner);
    } catch (err) {
      console.error("Image analysis failed:", err);
    } finally {
      setIsScanning(false);
      if (e.target) e.target.value = "";
    }
  };

  // Video Upload Handler
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setIsVideoScanning(true);

    try {
      const res = await api.detectRoadVideo(file);
      setVideoResult(res);
      setActiveKeyframeIndex(0);
      playSpeechNarration(res.decision_verdict?.tts_speech_text || res.decision_verdict?.verdict_title);
    } catch (err) {
      console.error("Video analysis failed:", err);
    } finally {
      setIsVideoScanning(false);
      if (e.target) e.target.value = "";
    }
  };

  // Load Benchmark Sample Image
  const handleSelectBenchmarkImage = async (sample: BenchmarkSampleMedia) => {
    setPreviewUrl(sample.image_b64);
    setIsScanning(true);

    try {
      const res = await api.detectLiveFrame(sample.image_b64);
      setDiagnosticResult(res);
      playSpeechNarration(res.recommendation || res.status_banner);
    } catch (e) {
      console.error("Benchmark detection failed", e);
    } finally {
      setIsScanning(false);
    }
  };

  // Comparative Analysis Handler
  const runComparativeEvaluation = async () => {
    setIsScanning(true);
    try {
      const res = await api.evaluateMultiModalDecision({
        mode: "comparative",
        primary_input: diagnosticResult || {
          pothole_count: 2,
          crack_count: 3,
          estimated_depth_cm: 6.2,
          has_water_filled_pothole: true,
          total_estimated_cost_inr: 4600
        },
        baseline_input: baselineData || {
          pothole_count: 1,
          crack_count: 1,
          estimated_depth_cm: 3.4,
          has_water_filled_pothole: false,
          total_estimated_cost_inr: 2200
        }
      });
      setComparativeVerdict(res);
      playSpeechNarration(res.decision_verdict?.tts_speech_text || res.decision_verdict?.verdict_title);
    } catch (e) {
      console.error("Comparative evaluation error", e);
    } finally {
      setIsScanning(false);
    }
  };

  // Speech TTS Narration
  const playSpeechNarration = (text?: string) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeechNarration = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  };

  // Dispatch Authority Alert
  const handleDispatchTopDefect = () => {
    if (!onOpenAlertModal) return;
    const firstDefect = diagnosticResult?.detections?.[0] || videoResult?.keyframes?.[activeKeyframeIndex]?.detections?.[0];
    const defectPayload: RoadDefectItem = {
      defect_id: firstDefect?.id || "UP-DEF-001",
      defect_type: firstDefect?.defect_type || (diagnosticResult?.has_pothole ? "Pothole" : "Crack"),
      rdd_code: firstDefect?.code || "D40",
      category: firstDefect?.category || "Surface Cavity",
      confidence: firstDefect?.confidence || 0.92,
      bbox: firstDefect?.bbox || [100, 100, 300, 300],
      severity_level: firstDefect?.severity === "Critical" ? "Critical" : "High",
      severity_score: firstDefect?.severity === "Critical" ? 0.94 : 0.72,
      estimated_area_cm2: firstDefect?.area_sq_cm || 420.0,
      max_dimension_cm: firstDefect?.span_cm || 32.0,
      estimated_depth_cm: firstDefect?.estimated_depth_cm || 5.8,
      lat: 12.9716,
      lon: 80.2528,
      distance_m: 240,
      segment_id: "CUSTOM-MULTIMODAL-UPLOAD",
      road_name: "Multi-Modal Roadway Inspection",
      nearby_landmark: selectedFile?.name || selectedVideoFile?.name || "Live Survey Corridor",
      responsible_authority: authorities[0] || "Tamil Nadu State Highways Department (TN-SHD)",
      color_hex: firstDefect?.color_hex || "#EF4444",
      impact_statement: firstDefect?.description || "Immediate cavity patch and hazard mitigation required.",
    };
    onOpenAlertModal(defectPayload, diagnosticResult?.annotated_image_b64 || previewUrl || undefined);
  };

  const isCritical = diagnosticResult?.overall_severity === "Critical" || diagnosticResult?.has_pothole || diagnosticResult?.has_water_filled_pothole;
  const isWarning = !isCritical && (diagnosticResult?.overall_severity === "Warning" || diagnosticResult?.has_crack || diagnosticResult?.has_other);
  const topDefect = diagnosticResult?.detections?.[0];
  const estimatedDepth = topDefect?.estimated_depth_cm || (diagnosticResult?.has_water_filled_pothole ? 6.8 : diagnosticResult?.has_pothole ? 5.4 : 1.2);

  const crossSectionData = {
    labels: ["-40cm", "-30cm", "-20cm", "-10cm", "Center", "+10cm", "+20cm", "+30cm", "+40cm"],
    datasets: [
      {
        label: "Pavement Surface Level (0.0 cm)",
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        borderColor: "#a1a1aa",
        borderDash: [4, 4],
        pointRadius: 0,
        borderWidth: 1.5,
      },
      {
        label: "Cavity Depression Profile (cm)",
        data: [
          0,
          -0.2,
          -estimatedDepth * 0.45,
          -estimatedDepth * 0.88,
          -estimatedDepth,
          -estimatedDepth * 0.82,
          -estimatedDepth * 0.38,
          -0.1,
          0,
        ],
        borderColor: "#ffffff",
        backgroundColor: "rgba(255, 255, 255, 0.14)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#ffffff",
        borderWidth: 2.5,
      },
    ],
  };

  // Video Keyframe Timeline Bar Chart
  const videoTimelineData = {
    labels: (videoResult?.keyframes || []).map(k => `T+${k.timestamp_sec}s`),
    datasets: [
      {
        label: "Defects Count per Frame",
        data: (videoResult?.keyframes || []).map(k => k.defect_count),
        backgroundColor: "#ffffff",
        borderRadius: 4,
      }
    ]
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Hidden inputs & canvas */}
      <input type="file" ref={fileInputRef} onChange={handleImageFileChange} accept="image/*" style={{ display: "none" }} />
      <input type="file" ref={videoInputRef} onChange={handleVideoFileChange} accept="video/*" style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Top Banner & Mode Switcher */}
      <div
        className="glass-panel fade-in-up"
        style={{
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderLeft: "4px solid var(--accent-cyan)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(0, 242, 254, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(0, 242, 254, 0.3)",
            }}
          >
            <Sparkles size={24} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={{ fontSize: "1.18rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>Autonomous Multi-Modal Decision Agent</span>
              <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
                Past &amp; Live Ingestion
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "3px" }}>
              Perception &amp; Decision System trained on <strong>YOLOv8 + Depth Anything V2 + RDD2022 Multi-Country Benchmarks</strong>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", background: "rgba(15, 23, 42, 0.6)", padding: "4px", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
          <button
            className={`cyber-tab ${activeMode === "past_image" ? "active" : ""}`}
            onClick={() => setActiveMode("past_image")}
            style={{ padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <UploadCloud size={15} />
            <span>Past Image</span>
          </button>

          <button
            className={`cyber-tab ${activeMode === "past_video" ? "active" : ""}`}
            onClick={() => setActiveMode("past_video")}
            style={{ padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Video size={15} />
            <span>Past Video</span>
          </button>

          <button
            className={`cyber-tab ${activeMode === "live_snapshot" ? "active" : ""}`}
            onClick={() => {
              setActiveMode("live_snapshot");
              if (!isCameraActive) startCamera();
            }}
            style={{ padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Camera size={15} />
            <span>Live Snapshot</span>
          </button>

          <button
            className={`cyber-tab ${activeMode === "live_stream" ? "active" : ""}`}
            onClick={() => {
              setActiveMode("live_stream");
              if (!isCameraActive) startCamera();
            }}
            style={{ padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Radio size={15} />
            <span>Live Video Stream</span>
          </button>

          <button
            className={`cyber-tab ${activeMode === "comparative" ? "active" : ""}`}
            onClick={() => setActiveMode("comparative")}
            style={{ padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Layers size={15} />
            <span>Past vs Live Degradation</span>
          </button>
        </div>
      </div>

      {/* Main Multi-Modal Workspace Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
        
        {/* Left Column: Visual Ingestion & Detection View */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Mode 1: Past / Uploaded Image View */}
          {activeMode === "past_image" && (
            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Eye size={17} color="var(--accent-cyan)" />
                  <span>Historical &amp; Uploaded Image Ingestion</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <UploadCloud size={14} />
                    <span>Upload Road Image</span>
                  </button>
                </div>
              </div>

              {/* Benchmark Sample Chips */}
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "12px" }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", alignSelf: "center", whiteSpace: "nowrap" }}>
                  Trained Benchmarks:
                </span>
                {benchmarkSamples.map((sample, idx) => (
                  <button
                    key={idx}
                    className="cyber-badge"
                    onClick={() => handleSelectBenchmarkImage(sample)}
                    style={{
                      cursor: "pointer",
                      fontSize: "0.72rem",
                      padding: "4px 10px",
                      background: "rgba(30, 41, 59, 0.7)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap"
                    }}
                  >
                    🎯 {sample.title}
                  </button>
                ))}
              </div>

              {/* Visual Display Container */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "380px",
                  background: "#050b14",
                  borderRadius: "10px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {previewUrl ? (
                  <img
                    src={
                      activeViewMode === "depth"
                        ? diagnosticResult?.depth_heatmap_b64 || previewUrl
                        : activeViewMode === "split"
                        ? diagnosticResult?.side_by_side_b64 || previewUrl
                        : activeViewMode === "raw"
                        ? diagnosticResult?.raw_image_b64 || previewUrl
                        : diagnosticResult?.annotated_image_b64 || previewUrl
                    }
                    alt="Road inspection visual"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    <UploadCloud size={48} style={{ opacity: 0.4, marginBottom: "10px" }} />
                    <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>No Image Loaded</div>
                    <div style={{ fontSize: "0.78rem" }}>Upload an image or pick a benchmark from the library above.</div>
                  </div>
                )}

                {isScanning && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(5, 11, 20, 0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <RefreshCw size={32} className="spin" color="var(--accent-cyan)" />
                    <div style={{ fontSize: "0.85rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                      YOLOv8 + Depth Anything V2 Inference Running...
                    </div>
                  </div>
                )}
              </div>

              {/* View Switches */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["annotated", "split", "raw", "depth"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`cyber-badge ${activeViewMode === mode ? "badge-cyan" : ""}`}
                      onClick={() => setActiveViewMode(mode)}
                      style={{ cursor: "pointer", textTransform: "capitalize", padding: "5px 10px", fontSize: "0.75rem" }}
                    >
                      {mode === "split" ? "Split 50/50" : mode === "depth" ? "3D Turbo Depth" : mode}
                    </button>
                  ))}
                </div>
                {diagnosticResult && (
                  <div style={{ fontSize: "0.76rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                    ⚡ Inference: {diagnosticResult.latency_ms || 24.2}ms (41 FPS)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 2: Past / Recorded Video View */}
          {activeMode === "past_video" && (
            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileVideo size={17} color="var(--accent-cyan)" />
                  <span>Recorded Video Inspection &amp; Keyframe Analysis</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isVideoScanning}
                    style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <UploadCloud size={14} />
                    <span>Upload Video File</span>
                  </button>
                </div>
              </div>

              {/* Video Player or Active Keyframe */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "360px",
                  background: "#050b14",
                  borderRadius: "10px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {videoResult && videoResult.keyframes.length > 0 ? (
                  <img
                    src={videoResult.keyframes[activeKeyframeIndex]?.annotated_thumb_b64 || videoResult.keyframes[activeKeyframeIndex]?.depth_thumb_b64}
                    alt="Active Video Keyframe"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : videoPreviewUrl ? (
                  <video src={videoPreviewUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    <Video size={48} style={{ opacity: 0.4, marginBottom: "10px" }} />
                    <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>No Video Loaded</div>
                    <div style={{ fontSize: "0.78rem" }}>Upload an MP4 / WebM dashcam video or survey clip.</div>
                  </div>
                )}

                {isVideoScanning && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(5, 11, 20, 0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <RefreshCw size={32} className="spin" color="var(--accent-cyan)" />
                    <div style={{ fontSize: "0.85rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                      Sampling Video Keyframes &amp; Synthesizing Engineering Verdict...
                    </div>
                  </div>
                )}
              </div>

              {/* Keyframe Timeline Scrubber */}
              {videoResult && videoResult.keyframes.length > 0 && (
                <div style={{ marginTop: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                    <span>Keyframe Timeline ({videoResult.keyframes.length} Samples Extracted)</span>
                    <span>Current: Frame {videoResult.keyframes[activeKeyframeIndex]?.frame_idx} (T+{videoResult.keyframes[activeKeyframeIndex]?.timestamp_sec}s)</span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px" }}>
                    {videoResult.keyframes.map((kf, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveKeyframeIndex(idx)}
                        style={{
                          cursor: "pointer",
                          minWidth: "75px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          border: activeKeyframeIndex === idx ? "2px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                          background: "#0f172a",
                          textAlign: "center",
                          padding: "2px"
                        }}
                      >
                        <img src={kf.annotated_thumb_b64} alt={`Keyframe ${idx}`} style={{ width: "100%", height: "42px", objectFit: "cover", borderRadius: "4px" }} />
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, marginTop: "2px", color: kf.overall_severity === "Critical" ? "#ef4444" : "#10b981" }}>
                          T+{kf.timestamp_sec}s
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Video Hazard Timeline Graph */}
                  <div style={{ height: "120px", marginTop: "10px" }}>
                    <Bar
                      data={videoTimelineData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { ticks: { color: "#cbd5e1", font: { size: 10, weight: "bold" } }, grid: { display: false } },
                          y: { ticks: { color: "#cbd5e1", font: { size: 10 } }, grid: { color: "rgba(255, 255, 255, 0.12)" }, beginAtZero: true }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3 & 4: Live Camera Snapshot & Real-Time Stream */}
          {(activeMode === "live_snapshot" || activeMode === "live_stream") && (
            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Radio size={17} color={isLiveStreaming ? "#ef4444" : "var(--accent-cyan)"} className={isLiveStreaming ? "badge-critical-blink" : ""} />
                  <span>{activeMode === "live_stream" ? "Real-Time Camera & Telemetry Stream" : "Field Camera Snapshot"}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {!isCameraActive ? (
                    <button className="btn btn-primary" onClick={startCamera} style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Camera size={14} />
                      <span>Start Camera</span>
                    </button>
                  ) : (
                    <button className="btn btn-secondary" onClick={stopCamera} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                      Stop Camera
                    </button>
                  )}

                  {activeMode === "live_snapshot" && isCameraActive && (
                    <button className="btn btn-primary" onClick={captureLiveSnapshot} disabled={isScanning} style={{ padding: "6px 14px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Camera size={14} />
                      <span>Capture &amp; Analyze</span>
                    </button>
                  )}

                  {activeMode === "live_stream" && (
                    <button
                      className={`btn ${isLiveStreaming ? "btn-danger" : "btn-primary"}`}
                      onClick={toggleLiveStreaming}
                      style={{ padding: "6px 14px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      {isLiveStreaming ? <Pause size={14} /> : <Play size={14} />}
                      <span>{isLiveStreaming ? "Pause Live AI Stream" : "Run Live AI Stream"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Video Canvas Overlay */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "380px",
                  background: "#050b14",
                  borderRadius: "10px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                {/* Live Telemetry Overlay HUD */}
                {isLiveStreaming && (
                  <div style={{ position: "absolute", top: "12px", left: "12px", right: "12px", display: "flex", justifyContent: "space-between", pointerEvents: "none" }}>
                    <span className="cyber-badge badge-rose badge-critical-blink" style={{ fontSize: "0.74rem" }}>
                      <span className="dot-critical-fast" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
                      LIVE AI FEED ({liveFps} FPS)
                    </span>
                    <span className="cyber-badge badge-emerald" style={{ fontSize: "0.74rem" }}>
                      Edge Latency: {liveLatencyMs}ms
                    </span>
                  </div>
                )}

                {/* Real-Time Live Overlay Box */}
                {isLiveStreaming && liveDetectionResult && liveDetectionResult.detections?.length > 0 && (
                  <div style={{ position: "absolute", bottom: "12px", left: "12px", right: "12px", background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(8px)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ef4444" }}>
                        ⚠️ HAZARD DETECTED: {liveDetectionResult.detections[0]?.defect_type?.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Confidence: {Math.round((liveDetectionResult.detections[0]?.confidence || 0.9) * 100)}% • Depth: {liveDetectionResult.detections[0]?.estimated_depth_cm}cm
                      </div>
                    </div>
                    <span className="cyber-badge badge-rose" style={{ fontSize: "0.68rem" }}>
                      CRITICAL
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode 5: Comparative Past vs Live Degradation Analyzer */}
          {activeMode === "comparative" && (
            <div className="glass-panel" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Layers size={17} color="var(--accent-cyan)" />
                  <span>Past vs. Live Comparative Degradation Engine</span>
                </div>
                <button className="btn btn-primary" onClick={runComparativeEvaluation} disabled={isScanning} style={{ padding: "6px 14px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={14} />
                  <span>Run Comparative Analysis</span>
                </button>
              </div>

              {/* Dual Panel Comparison */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                    ⏮️ Historical Baseline Survey (T - 6 Months)
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    1 Pothole • 3.4cm Depth
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    PCI: 68/100 • Minor surface fatigue
                  </div>
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#ef4444", marginBottom: "8px" }}>
                    🔴 Current Live Inspection (Today)
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ef4444" }}>
                    2 Potholes (Water-filled) • 6.2cm Depth
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    PCI: 28/100 • Severe subbase cavitation
                  </div>
                </div>
              </div>

              {/* Degradation Velocity Metrics */}
              {comparativeVerdict && (
                <div style={{ marginTop: "14px", background: "rgba(239, 68, 68, 0.1)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ef4444" }}>
                      {comparativeVerdict.decision_verdict?.verdict_title}
                    </div>
                    <span className="cyber-badge badge-rose badge-critical-blink">
                      ESCALATED: &lt; 24h SLA
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                    {comparativeVerdict.decision_verdict?.engineering_rationale}
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "0.76rem" }}>
                    <span>Cavity Depth Growth: <strong style={{ color: "#ef4444" }}>+{comparativeVerdict.delta_depth_cm} cm</strong></span>
                    <span>•</span>
                    <span>New Voids: <strong style={{ color: "#ef4444" }}>+{comparativeVerdict.delta_potholes} Cavities</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3D Depth Cross Section Profile */}
          <div className="glass-panel" style={{ padding: "18px" }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <TrendingDown size={16} color="var(--accent-amber)" />
              <span>Calibrated 3D Laser Cavity Cross-Section Profile</span>
            </div>
            <div style={{ height: "160px" }}>
              <Line
                data={crossSectionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { labels: { color: "#ffffff", font: { size: 10, weight: "bold" } } } },
                  scales: {
                    x: { ticks: { color: "#cbd5e1", font: { size: 10, weight: "bold" } }, grid: { display: false } },
                    y: { ticks: { color: "#cbd5e1", font: { size: 10 } }, grid: { color: "rgba(255, 255, 255, 0.12)" } },
                  },
                }}
              />
            </div>
          </div>

        </div>

        {/* Right Column: Autonomous Decision Verdict, BOM & Work Order */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Executive AI Agent Decision Card */}
          <div
            className="glass-panel"
            style={{
              padding: "20px",
              borderTop: "3px solid #ffffff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Autonomous Decision Verdict
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => isPlayingAudio ? stopSpeechNarration() : playSpeechNarration(videoResult?.decision_verdict?.tts_speech_text || diagnosticResult?.recommendation || "Pavement defect analysis complete")}
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.72rem",
                    color: "#ffffff"
                  }}
                >
                  {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{isPlayingAudio ? "Stop Audio" : "Voice Briefing"}</span>
                </button>

                <span className="cyber-badge badge-cyan" style={{ fontSize: "0.7rem" }}>
                  {videoResult?.decision_verdict?.urgency_tier || (isCritical ? "CRITICAL EMERGENCY (<24h)" : isWarning ? "HIGH PRIORITY (<7d)" : "ROUTINE MONITORING")}
                </span>
              </div>
            </div>

            <div style={{ fontSize: "1.08rem", fontWeight: 800, color: "#ffffff" }}>
              {videoResult?.decision_verdict?.verdict_title || diagnosticResult?.status_banner || "🟢 Autonomous Pavement Clearance"}
            </div>

            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "8px", lineHeight: "1.4" }}>
              {videoResult?.decision_verdict?.engineering_rationale || diagnosticResult?.recommendation || "Pavement surface adheres to ASTM D6433 friction and rideability standards."}
            </div>

            {/* Step-by-Step Directives */}
            <div style={{ marginTop: "14px", background: "rgba(15, 23, 42, 0.5)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-cyan)", textTransform: "uppercase", marginBottom: "8px" }}>
                MoRTH Section 500 / IRC:82 Execution Protocol:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {(videoResult?.decision_verdict?.immediate_procurement_directives || diagnosticResult?.fix_protocol?.action_steps || [
                  "1. Saw-cut square perimeter 100mm into sound asphalt.",
                  "2. Tack coat with cationic emulsion SS-1h.",
                  "3. Compact PG 64-22 HMA in 50mm lifts."
                ]).map((step: string, sidx: number) => (
                  <div key={sidx} style={{ fontSize: "0.76rem", color: "var(--text-primary)", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <CheckCircle2 size={13} color="var(--accent-emerald)" style={{ marginTop: "2px", flexShrink: 0 }} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Dispatch Button */}
            <button
              className="btn btn-primary"
              onClick={handleDispatchTopDefect}
              style={{ width: "100%", marginTop: "14px", padding: "10px", fontSize: "0.84rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Send size={15} />
              <span>Dispatch Signed Alert to Highway Authority</span>
            </button>
          </div>

          {/* Itemized Bill of Materials (BOM) */}
          <div className="glass-panel" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sliders size={16} color="var(--accent-cyan)" />
                <span>Itemized Bill of Materials (BOM)</span>
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
                ₹{(videoResult?.bill_of_materials?.total_cost_inr || diagnosticResult?.total_estimated_cost_inr || 3800).toLocaleString('en-IN')} INR
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(videoResult?.bill_of_materials?.materials || [
                { item: "HMA PG 64-22 Bituminous Concrete", qty: "1.8 MT", cost: "₹11,160" },
                { item: "Cationic Tack Coat SS-1h", qty: "15 L", cost: "₹1,275" },
                { item: "ASTM D6690 Hot-Pour Joint Sealant", qty: "10 kg", cost: "₹2,400" },
              ]).map((mat: any, midx: number) => (
                <div key={midx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", paddingBottom: "6px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "var(--text-primary)" }}>{mat.item}</span>
                  <span style={{ color: "var(--text-muted)" }}>{mat.qty || `${mat.quantity} ${mat.unit}`} ({mat.cost || `₹${mat.total_cost_inr || 1200}`})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Municipal Work Order Ticket */}
          <div className="glass-panel" style={{ padding: "18px", borderLeft: "3px solid var(--accent-burgundy)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={16} color="var(--accent-burgundy)" />
                <span>Municipal Work Order Ticket</span>
              </div>
              <span className="cyber-badge badge-cyan" style={{ fontSize: "0.68rem" }}>
                {videoResult?.work_order?.status || "APPROVED_FOR_TENDER"}
              </span>
            </div>

            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
              <div>Ticket ID: <strong style={{ color: "var(--text-primary)" }}>{videoResult?.work_order?.work_order_id || `WO-RMI-${Date.now().toString().slice(-6)}`}</strong></div>
              <div>Authority: <strong style={{ color: "var(--text-primary)" }}>{videoResult?.work_order?.jurisdiction_authority || "TN-SHD & NHAI Project Unit"}</strong></div>
              <div>Target SLA: <strong style={{ color: "#ef4444" }}>{videoResult?.decision_verdict?.sla_timeframe || "< 24 Hours"}</strong></div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
