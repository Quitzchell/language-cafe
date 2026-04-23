-- LC-35: romanization line for non-Latin practice languages.
-- Nullable because most rows are Latin-script translations that never need one,
-- and the UI tolerates missing values (the extra line is simply skipped).
-- Known limitation: only the practice-language side is consumed today. When a
-- second non-Latin language lands, native-side romanization will also be needed
-- (e.g. a Japanese-native learner with a Korean target).
ALTER TABLE card_translations ADD COLUMN romanization text;
