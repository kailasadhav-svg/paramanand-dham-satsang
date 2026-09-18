import {
  attendanceTotal,
  listDutiesOnDate,
  listMeetingsOnDate,
  listPlaces,
  listQuestions,
  type MeetingWithPlace,
  type PlaceDutyWithPlace,
  type QuestionWithPlace,
} from "./db";
import { formatMarathiDate, formatMarathiShort, weekFromThursday } from "./dates";
import { ANSWERED_BY_LABEL, CHINTAN_LABEL, TOPIC_LABEL, VAHAK_LABEL_SHORT } from "./labels";
import { displayPhone } from "./offline/phone";

export { ANSWERED_BY_LABEL, TOPIC_LABEL } from "./labels";

function line(text = "") {
  return text;
}

export async function buildWeeklyReport(thursdayYmd: string) {
  const week = weekFromThursday(thursdayYmd);
  const places = await listPlaces();
  const meetings = await listMeetingsOnDate(thursdayYmd);
  const duties = await listDutiesOnDate(thursdayYmd);
  const byPlace = new Map<number, MeetingWithPlace>();
  for (const m of meetings) byPlace.set(m.place_id, m);
  const dutyByPlace = new Map<number, PlaceDutyWithPlace>();
  for (const d of duties) dutyByPlace.set(d.place_id, d);

  const questions = await listQuestions({ from: week.start, to: week.end });
  const unanswered = questions.filter((q) => !q.answer || !q.answer.trim());
  const answered = questions.filter((q) => q.answer && q.answer.trim());

  let grandTotal = 0;
  const placeRows = places.map((place) => {
    const meeting = byPlace.get(place.id);
    const duty = dutyByPlace.get(place.id) ?? null;
    const total = meeting ? attendanceTotal(meeting) : 0;
    grandTotal += total;
    return { place, meeting, duty, total };
  });

  const lines: string[] = [
    "🙏 जय श्री परमानंद 🙏",
    "*परमानंद धाम — साप्ताहिक सत्संग अहवाल*",
    "",
    `📅 ${formatMarathiDate(thursdayYmd)} | रात्री ८:००`,
    `🗓️ सप्ताह: ${formatMarathiShort(week.start)} – ${formatMarathiShort(week.end)}`,
    "━━━━━━━━━━━━",
  ];

  for (const row of placeRows) {
    lines.push(`📍 *${row.place.name}*`);
    if (row.duty) {
      const who =
        row.duty.charansevak_name ||
        displayPhone(row.duty.charansevak_phone);
      lines.push(`🙏 ${VAHAK_LABEL_SHORT}: ${who} (${displayPhone(row.duty.charansevak_phone)})`);
    }
    if (row.meeting?.checkin_ok != null) {
      const d = row.meeting.checkin_distance_m;
      lines.push(
        row.meeting.checkin_ok
          ? `📍 स्थळ-तपास: OK${d != null ? ` (${d} मी)` : ""}`
          : `⚠️ स्थळ-तपास: बाहेर${d != null ? ` (${d} मी)` : ""}`,
      );
    }
    if (!row.meeting) {
      lines.push("नोंद नाही");
    } else {
      const m = row.meeting;
      lines.push(
        `👥 उपस्थिती: *${row.total}* (पुरुष ${m.men} · स्त्रिया ${m.women} · बालके ${m.children})`,
      );
      if (m.topic_kind || m.topic_title) {
        const kind = m.topic_kind ? TOPIC_LABEL[m.topic_kind] : "";
        const title = m.topic_title ? ` — ${m.topic_title}` : "";
        lines.push(`📖 विषय: ${kind}${title}`.trim());
      }
      if (m.conductor) lines.push(`🎤 विचार वाहक: ${m.conductor}`);
      if (m.notes) lines.push(`📝 ${CHINTAN_LABEL}: ${m.notes}`);
    }

    const qs = questions.filter((q) => q.place_id === row.place.id);
    if (qs.length) {
      lines.push("❓ प्रश्नोत्तर:");
      qs.forEach((q, i) => lines.push(...formatQuestionLines(q, i + 1)));
    }
    lines.push("━━━━━━━━━━━━");
  }

  const unplaced = questions.filter((q) => !q.place_id);
  if (unplaced.length) {
    lines.push("❓ *इतर प्रश्न:*");
    unplaced.forEach((q, i) => lines.push(...formatQuestionLines(q, i + 1)));
    lines.push("━━━━━━━━━━━━");
  }

  lines.push(`📊 *एकूण उपस्थिती: ${grandTotal}*`);
  lines.push(
    `❓ *प्रश्न: ${questions.length} | उत्तरित: ${answered.length} | प्रलंबित: ${unanswered.length}*`,
  );
  lines.push("");
  lines.push("— परमानंद धाम सत्संग");

  return {
    thursday: thursdayYmd,
    week,
    places: placeRows,
    questions,
    totals: {
      attendance: grandTotal,
      questions: questions.length,
      answered: answered.length,
      unanswered: unanswered.length,
    },
    whatsappText: lines.map(line).join("\n"),
  };
}

function formatQuestionLines(q: QuestionWithPlace, index: number): string[] {
  const out = [`${index}) प्रश्न: ${q.question}`];
  if (q.answer && q.answer.trim()) {
    const by = q.answered_by ? ANSWERED_BY_LABEL[q.answered_by] : "";
    out.push(`   उत्तर${by ? ` (${by})` : ""}: ${q.answer}`);
  } else {
    out.push("   उत्तर: प्रलंबित");
  }
  return out;
}
