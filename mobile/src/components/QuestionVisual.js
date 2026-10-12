import { useState } from "react";
import { View, Text, Image, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator } from "react-native";
import Svg, { Rect, Line, Polyline, Circle, Path, Text as SvgText, G } from "react-native-svg";
import { API_URL } from "../api/client";
import { colors, radius, spacing } from "../theme/theme";

// The picture part of a chart or figure question.
//
// A Data Interpretation chart is drawn here from its numbers (the server
// sends the data, never an image). A figure question shows its uploaded
// picture. Both scroll sideways rather than squeeze when the screen is
// narrow, so every label stays readable.

const PALETTE = ["#4F46E5", "#F59E0B", "#10B981", "#EF4444", "#0EA5E9", "#A855F7"];
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(+Number(n).toFixed(2)));

// Axis ticks on round numbers - 0, 10, 20, 30 rather than 7.5 and 22.5.
function niceTicks(max) {
  if (!(max > 0)) return [0, 1];
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const n = rough / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const out = [];
  for (let t = 0; t <= top + step / 2; t += step) out.push(+t.toFixed(6));
  return out;
}

function Legend({ series }) {
  if (!series || series.length < 2) return null;
  return (
    <View style={styles.legend}>
      {series.map((s, i) => (
        <View key={s.name} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: PALETTE[i % PALETTE.length] }]} />
          <Text style={styles.legendText}>
            {s.name}
            {s.as === "line" ? " (line)" : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BarLine({ chart, width }) {
  const cats = chart.categories || [];
  const series = chart.series || [];
  const W = Math.max(width, cats.length * 64 + 56);
  const H = 230;
  const pad = { l: 44, r: 10, t: 16, b: 34 };
  const ticks = niceTicks(Math.max(0, ...series.flatMap((s) => s.values)));
  const max = ticks[ticks.length - 1];
  const ih = H - pad.t - pad.b;
  const iw = W - pad.l - pad.r;
  const y = (v) => pad.t + ih - (v / max) * ih;
  const band = iw / Math.max(cats.length, 1);
  const bars = chart.type === "line" ? [] : series.filter((s) => chart.type !== "mixed" || s.as !== "line");
  const lines = chart.type === "line" ? series : chart.type === "mixed" ? series.filter((s) => s.as === "line") : [];
  const bw = bars.length ? (band * 0.72) / bars.length : 0;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={W > width}>
      <Svg width={W} height={H}>
        {ticks.map((t) => (
          <G key={t}>
            <Line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
            <SvgText x={pad.l - 6} y={y(t) + 4} fontSize={10} fill={colors.slate} textAnchor="end">
              {fmt(t)}
            </SvgText>
          </G>
        ))}
        {cats.map((c, i) => (
          <SvgText key={c} x={pad.l + band * (i + 0.5)} y={H - pad.b + 16} fontSize={11} fill={colors.inkSoft} textAnchor="middle">
            {c}
          </SvgText>
        ))}
        {bars.map((s, si) =>
          s.values.map((v, i) => {
            const x = pad.l + band * i + band * 0.14 + bw * si;
            const color = PALETTE[series.indexOf(s) % PALETTE.length];
            return (
              <G key={`${s.name}-${i}`}>
                <Rect x={x} y={y(v)} width={Math.max(bw - 2, 2)} height={Math.max(pad.t + ih - y(v), 0)} rx={2} fill={color} />
                <SvgText x={x + (bw - 2) / 2} y={y(v) - 3} fontSize={9} fill={colors.ink} textAnchor="middle">
                  {fmt(v)}
                </SvgText>
              </G>
            );
          })
        )}
        {lines.map((s) => {
          const color = PALETTE[series.indexOf(s) % PALETTE.length];
          const pts = s.values.map((v, i) => [pad.l + band * (i + 0.5), y(v)]);
          return (
            <G key={s.name}>
              <Polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={2.5} />
              {pts.map(([px, py], i) => (
                <G key={i}>
                  <Circle cx={px} cy={py} r={3.5} fill={color} />
                  <SvgText x={px} y={py - 7} fontSize={9} fill={colors.ink} textAnchor="middle">
                    {fmt(s.values[i])}
                  </SvgText>
                </G>
              ))}
            </G>
          );
        })}
        <Line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke={colors.slateSoft} strokeWidth={1} />
      </Svg>
    </ScrollView>
  );
}

function Pie({ chart }) {
  const s = chart.series?.[0];
  if (!s) return null;
  const total = s.values.reduce((a, b) => a + b, 0) || 1;
  const R = 80;
  const cx = 90;
  const cy = 90;
  let a = -Math.PI / 2;
  return (
    <View style={styles.pieRow}>
      <Svg width={180} height={180}>
        {s.values.map((v, i) => {
          const da = (v / total) * Math.PI * 2;
          const x1 = cx + R * Math.cos(a);
          const y1 = cy + R * Math.sin(a);
          a += da;
          const x2 = cx + R * Math.cos(a);
          const y2 = cy + R * Math.sin(a);
          return (
            <Path
              key={i}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${da > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`}
              fill={PALETTE[i % PALETTE.length]}
              stroke="#fff"
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>
      <View style={{ flex: 1, minWidth: 140 }}>
        {chart.categories.map((c, i) => (
          <View key={c} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: PALETTE[i % PALETTE.length] }]} />
            <Text style={styles.legendText}>
              {c}: {fmt(s.values[i])} ({fmt((s.values[i] / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DataTable({ chart }) {
  return (
    <ScrollView horizontal>
      <View>
        <View style={[styles.tr, styles.trHead]}>
          <Text style={[styles.td, styles.tdFirst]} />
          {chart.series.map((s) => (
            <Text key={s.name} style={[styles.td, styles.th]}>
              {s.name}
            </Text>
          ))}
        </View>
        {chart.categories.map((c, i) => (
          <View key={c} style={styles.tr}>
            <Text style={[styles.td, styles.tdFirst]}>{c}</Text>
            {chart.series.map((s) => (
              <Text key={s.name} style={styles.td}>
                {fmt(s.values[i])}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function ChartView({ chart, hindi = false }) {
  const { width } = useWindowDimensions();
  if (!chart) return null;
  const title = (hindi && chart.titleHi) || chart.title;
  return (
    <View style={styles.box}>
      {!!(title || chart.unit) && (
        <Text style={styles.title}>
          {title}
          {chart.unit ? <Text style={styles.unit}> ({chart.unit})</Text> : null}
        </Text>
      )}
      {chart.type === "caselet" ? (
        <Text style={styles.caselet}>{(hindi && chart.caseletHi) || chart.caselet}</Text>
      ) : chart.type === "pie" ? (
        <Pie chart={chart} />
      ) : chart.type === "table" ? (
        <DataTable chart={chart} />
      ) : (
        <>
          <BarLine chart={chart} width={width - 64} />
          <Legend series={chart.series} />
        </>
      )}
    </View>
  );
}

function FigureImage({ imageId }) {
  const { width } = useWindowDimensions();
  const [ratio, setRatio] = useState(null);
  const [failed, setFailed] = useState(false);
  const uri = `${String(API_URL).replace(/\/$/, "")}/question-images/${imageId}`;
  const w = width - 48;
  if (failed) {
    return (
      <View style={[styles.box, styles.center]}>
        <Text style={styles.note}>The figure could not be loaded. Check your connection and reopen the test.</Text>
      </View>
    );
  }
  return (
    <View style={styles.figureBox}>
      {!ratio && <ActivityIndicator color={colors.brand} style={{ marginVertical: spacing.lg }} />}
      <Image
        source={{ uri }}
        style={{ width: w, height: ratio ? w / ratio : 1 }}
        resizeMode="contain"
        onLoad={(e) => {
          const s = e.nativeEvent?.source;
          if (s?.width && s?.height) setRatio(s.width / s.height);
          else setRatio(2);
        }}
        onError={() => setFailed(true)}
        accessibilityLabel="Figure for this question"
      />
    </View>
  );
}

export default function QuestionVisual({ question, hindi = false }) {
  const v = question?.visual;
  if (!v?.kind) return null;
  if (v.kind === "chart") return <ChartView chart={v.chart} hindi={hindi} />;
  if (v.kind === "figure" && v.figure?.imageId) return <FigureImage imageId={v.figure.imageId} />;
  return null;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  center: { alignItems: "center", justifyContent: "center", minHeight: 80 },
  title: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  unit: { fontWeight: "400", color: colors.slate },
  caselet: { fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  swatch: { width: 11, height: 11, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.inkSoft },
  pieRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  tr: { flexDirection: "row", borderTopWidth: 1, borderColor: colors.border },
  trHead: { backgroundColor: colors.slateLight, borderTopWidth: 0 },
  td: { minWidth: 72, paddingVertical: 6, paddingHorizontal: 8, fontSize: 13, color: colors.inkSoft, textAlign: "right" },
  th: { fontWeight: "700", color: colors.ink },
  tdFirst: { textAlign: "left", fontWeight: "600", color: colors.ink, minWidth: 80 },
  figureBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 4,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  note: { fontSize: 13, color: colors.slate, textAlign: "center" },
});
