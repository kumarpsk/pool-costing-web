import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./timeline.css";

function safeToFixed(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }
  return Number(value).toFixed(decimals);
}

const Timeline = ({ poolSize, resultData }) => {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!poolSize || !resultData) {
      setLoading(false);
      return;
    }

    // --- Base calculation as per your code ---
    const volume =
      resultData.volume_m3 ||
      (poolSize.length * poolSize.width * poolSize.depth);
    const sizeFactor = (poolSize.length || 0) * (poolSize.width || 0);
    const depthFactor = poolSize.depth || 1;
    const complexityFactor = depthFactor > 1.5 ? 1.2 : 1;

    const baseDays = Math.max(
      21,
      Math.ceil(
        volume * 0.8 +
          sizeFactor * 0.6 +
          depthFactor * 8 * complexityFactor
      )
    );

    // Build timeline with original durations
    const rawTimeline = [
      {
        phase: "Site Preparation",
        ratio: 0.07,
        min: 3,
        status: "completed",
        description: "Clearing, leveling, and marking the pool area",
      },
      {
        phase: "Excavation",
        ratio: 0.28,
        min: 4,
        status: "in-progress",
        description:
          "Digging the pool structure according to design specifications",
      },
      {
        phase: "Structural Work",
        ratio: 0.3,
        min: 6,
        status: "pending",
        description:
          "Rebar installation, plumbing, and electrical rough-in",
      },
      {
        phase: "Shotcreting",
        ratio: 0.13,
        min: 4,
        status: "pending",
        description:
          "Applying shotcrete to form the pool shell with proper curing time",
      },
      {
        phase: "Waterproofing & Tiling",
        ratio: 0.16,
        min: 5,
        status: "pending",
        description:
          "Waterproofing membrane application and premium tile installation",
      },
      {
        phase: "Equipment Installation",
        ratio: 0.08,
        min: 3,
        status: "pending",
        description:
          "Installing pumps, filters, heating systems and control systems",
      },
      {
        phase: "Finishing & Testing",
        ratio: 0.08,
        min: 3,
        status: "pending",
        description:
          "Final touches, comprehensive cleaning, and full system testing",
      },
    ];

    // Compute initial durations
    let initialDurations = rawTimeline.map((p) =>
      Math.max(p.min, Math.ceil(baseDays * p.ratio))
    );

    let totalInitial = initialDurations.reduce((a, b) => a + b, 0);

    // --- Scaling step ---
    let scaledDurations = [...initialDurations];

    if (totalInitial > 180) {
      const scaleFactor = 180 / totalInitial;
      // scale each and round
      scaledDurations = initialDurations.map((d, i) =>
        Math.max(rawTimeline[i].min, Math.floor(d * scaleFactor))
      );

      // ensure total = 180 exactly by distributing remainder
      let allocated = scaledDurations.reduce((a, b) => a + b, 0);
      let remaining = 180 - allocated;

      while (remaining > 0) {
        // give +1 to the phase with highest original fractional part
        let idx = initialDurations.indexOf(
          Math.max(...initialDurations)
        );
        scaledDurations[idx]++;
        remaining--;
      }
    }

    // Build final timeline data
    const finalTimeline = rawTimeline.map((p, i) => ({
      phase: p.phase,
      duration: scaledDurations[i],
      status: p.status,
      description: p.description,
    }));

    setTimelineData(finalTimeline);
    setLoading(false);
  }, [poolSize, resultData]);

  if (loading) {
    return <div className="loading-spinner">Calculating timeline...</div>;
  }

  if (!poolSize || !resultData) {
    return (
      <div className="error-message">
        No pool dimension data available for timeline calculation.
      </div>
    );
  }

  const totalDuration = timelineData.reduce(
    (sum, phase) => sum + phase.duration,
    0
  );

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3>Construction Timeline</h3>
        <div className="total-duration">
          <span className="duration-label">Total Duration:</span>
          <span className="duration-value">
            {totalDuration} working days
          </span>
        </div>
        <div className="pool-dimensions">
          <span className="dimensions-label">Based on Pool: </span>
          <span className="dimensions-value">
            {resultData.dimensions || "N/A"} m (
            {safeToFixed(
              resultData.volume_m3 ||
                poolSize.length * poolSize.width * poolSize.depth
            )}{" "}
            m³)
          </span>
        </div>
      </div>

      <div className="timeline">
        {timelineData.map((phase, index) => (
          <div key={index} className={`timeline-phase ${phase.status}`}>
            <div className="phase-header">
              <div className="phase-icon">
                {phase.status === "completed" && "✅"}
                {phase.status === "in-progress" && "🔄"}
                {phase.status === "pending" && "⏳"}
              </div>
              <div className="phase-info">
                <h4 className="phase-title">{phase.phase}</h4>
                
              </div>
            </div>
            <p className="phase-description">{phase.description}</p>
            <div className="progress-bar">
              <div
                className={`progress-fill ${phase.status}`}
                style={{
                  width:
                    phase.status === "completed"
                      ? "100%"
                      : phase.status === "in-progress"
                      ? "50%"
                      : "0%",
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="timeline-note-highlight">
  <div className="timeline-note-title">
    <span className="timeline-note-icon">📋</span>
    Project Timeline Disclaimer
  </div>
  <p className="timeline-note-content">
    <strong>Estimated Schedule:</strong> The provided timeline is calculated using industry-standard 
    metrics for pool construction. While we strive for accuracy, actual completion dates may be 
    influenced by external factors including weather conditions, regulatory approvals, and onsite 
    conditions. Regular progress updates will be provided throughout the project lifecycle.
  </p>
</div>
    </div>
  );
};

export default Timeline;
