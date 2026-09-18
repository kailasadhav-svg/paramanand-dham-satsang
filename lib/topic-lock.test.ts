import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  PLACE_TOPIC_LOCKED_ERROR,
  countPlaceChintan,
  isNonEmptyChintan,
  isPlaceTopicLocked,
  meetingTopicFieldsTouched,
  placeTopicLockState,
  topicLockPlaceCode,
} from "./topic-lock.ts";

const nashikEmpty = { place_code: "nashik", answer: "   " };
const nashikOne = { place_code: "nashik", answer: "मी कोण आहे यावर चिंतन" };
const shindiOne = { place_code: "shindi", answer: "गाव चिंतन" };
const ambashiOne = { place_code: "ambashi", answer: "जुन्या कोडचे चिंतन" };

describe("place topic lock helper", () => {
  it("keeps विषय editable when that गाव has 0 non-empty चिंतन", () => {
    assert.equal(isPlaceTopicLocked(0), false);
    assert.deepEqual(placeTopicLockState([], "nashik"), {
      topic_locked: false,
      chintan_count: 0,
    });
    assert.deepEqual(placeTopicLockState([nashikEmpty, shindiOne], "nashik"), {
      topic_locked: false,
      chintan_count: 0,
    });
    assert.equal(countPlaceChintan([shindiOne], "nashik"), 0);
  });

  it("locks विषय when that गाव has ≥1 submitted चिंतन", () => {
    assert.equal(isPlaceTopicLocked(1), true);
    assert.equal(isPlaceTopicLocked(2), true);
    assert.deepEqual(placeTopicLockState([nashikOne], "nashik"), {
      topic_locked: true,
      chintan_count: 1,
    });
    assert.deepEqual(
      placeTopicLockState([nashikEmpty, nashikOne, shindiOne], "nashik"),
      { topic_locked: true, chintan_count: 1 },
    );
    assert.equal(
      countPlaceChintan([nashikOne, { ...nashikOne, answer: "दुसरे चिंतन" }], "nashik"),
      2,
    );
  });

  it("does not count whitespace-only answers as submitted चिंतन", () => {
    assert.equal(isNonEmptyChintan(""), false);
    assert.equal(isNonEmptyChintan("  \n"), false);
    assert.equal(isNonEmptyChintan(null), false);
    assert.equal(isNonEmptyChintan("चिंतन"), true);
  });

  it("treats ambashi and शिंदी as the same गाव", () => {
    assert.equal(topicLockPlaceCode("ambashi"), "shindi");
    assert.equal(topicLockPlaceCode("शिंदी"), "shindi");
    assert.deepEqual(placeTopicLockState([ambashiOne], "shindi"), {
      topic_locked: true,
      chintan_count: 1,
    });
    assert.deepEqual(placeTopicLockState([shindiOne], "ambashi"), {
      topic_locked: true,
      chintan_count: 1,
    });
  });

  it("only treats topic_kind / topic_title as विषय fields", () => {
    assert.equal(meetingTopicFieldsTouched({}), false);
    assert.equal(meetingTopicFieldsTouched({ topic_kind: "atmaprabha" }), true);
    assert.equal(meetingTopicFieldsTouched({ topic_title: "गीता" }), true);
    assert.equal(
      meetingTopicFieldsTouched({ topic_kind: null, topic_title: null }),
      true,
    );
  });

  it("uses the product Marathi error and never टिपणी", () => {
    assert.equal(
      PLACE_TOPIC_LOCKED_ERROR,
      "या गावाचे चिंतन आले आहे; विषय आता बदलता येणार नाही.",
    );
    assert.equal(PLACE_TOPIC_LOCKED_ERROR.includes("टिपणी"), false);
    assert.match(PLACE_TOPIC_LOCKED_ERROR, /चिंतन/);
  });
});

describe("meetings API enforces the गाव विषय lock", () => {
  it("exposes topic_locked on GET and rejects विषय PUT when locked", () => {
    const meetings = readFileSync(
      new URL("../app/api/meetings/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(meetings, /getMeetingTopicLock/);
    assert.match(meetings, /topic_locked/);
    assert.match(meetings, /chintan_count/);
    assert.match(meetings, /PLACE_TOPIC_LOCKED_ERROR/);
    assert.match(meetings, /meetingTopicFieldsTouched/);
    const chintan = readFileSync(new URL("./chintan.ts", import.meta.url), "utf8");
    assert.match(chintan, /placeTopicLockState/);
    assert.match(chintan, /listWeeklyAnswers/);
  });
});
