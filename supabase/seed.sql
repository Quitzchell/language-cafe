-- Cards (questions are always in English)
INSERT INTO cards (id, question, proficiency_level) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'What is your favorite food?', 'A1'),
    ('c1000000-0000-0000-0000-000000000002', 'Where are you from?', 'A1'),
    ('c1000000-0000-0000-0000-000000000003', 'What do you do in your free time?', 'A2'),
    ('c1000000-0000-0000-0000-000000000004', 'Can you describe a typical day in your life?', 'B1'),
    ('c1000000-0000-0000-0000-000000000005', 'What is your favorite hobby?', 'A1'),
    ('c1000000-0000-0000-0000-000000000006', 'What do you like to do on weekends?', 'B1'),
    ('c1000000-0000-0000-0000-000000000007', 'How would you describe your hometown?', 'B2'),
    ('c1000000-0000-0000-0000-000000000008', 'What is your name?', 'A1'),
    ('c1000000-0000-0000-0000-000000000009', 'What do you do on weekends?', 'A2'),
    ('c1000000-0000-0000-0000-000000000010', 'Please tell me about your country''s culture.', 'B2'),
    ('c1000000-0000-0000-0000-000000000011', 'What are the main challenges your generation faces compared to previous ones?', 'C1'),
    ('c1000000-0000-0000-0000-000000000012', 'How do you think technology has changed the way people form relationships?', 'C1'),
    ('c1000000-0000-0000-0000-000000000013', 'To what extent do you believe linguistic diversity contributes to or hinders global cooperation?', 'C2'),
    ('c1000000-0000-0000-0000-000000000014', 'How would you critique the argument that economic growth is inherently at odds with environmental sustainability?', 'C2');

-- Card translations (Dutch)
INSERT INTO card_translations (card_id, language, translation) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'Dutch', 'Wat is je favoriete eten?'),
    ('c1000000-0000-0000-0000-000000000002', 'Dutch', 'Waar kom je vandaan?'),
    ('c1000000-0000-0000-0000-000000000003', 'Dutch', 'Wat doe je in je vrije tijd?'),
    ('c1000000-0000-0000-0000-000000000004', 'Dutch', 'Kun je een typische dag in je leven beschrijven?'),
    ('c1000000-0000-0000-0000-000000000005', 'Dutch', 'Wat is je favoriete hobby?'),
    ('c1000000-0000-0000-0000-000000000006', 'Dutch', 'Wat doe je graag in het weekend?'),
    ('c1000000-0000-0000-0000-000000000007', 'Dutch', 'Hoe zou je je geboorteplaats beschrijven?'),
    ('c1000000-0000-0000-0000-000000000008', 'Dutch', 'Wat is je naam?'),
    ('c1000000-0000-0000-0000-000000000009', 'Dutch', 'Wat doe je in het weekend?'),
    ('c1000000-0000-0000-0000-000000000010', 'Dutch', 'Vertel me over de cultuur van je land.'),
    ('c1000000-0000-0000-0000-000000000011', 'Dutch', 'Wat zijn de grootste uitdagingen waarmee jouw generatie te maken heeft in vergelijking met eerdere generaties?'),
    ('c1000000-0000-0000-0000-000000000012', 'Dutch', 'Hoe denk je dat technologie de manier waarop mensen relaties vormen heeft veranderd?'),
    ('c1000000-0000-0000-0000-000000000013', 'Dutch', 'In hoeverre draagt taaldiversiteit volgens jou bij aan of belemmert het de mondiale samenwerking?'),
    ('c1000000-0000-0000-0000-000000000014', 'Dutch', 'Hoe zou je het argument bekritiseren dat economische groei inherent in strijd is met ecologische duurzaamheid?');

-- Card translations (Japanese)
INSERT INTO card_translations (card_id, language, translation) VALUES
    ('c1000000-0000-0000-0000-000000000001', 'Japanese', 'あなたの好きな食べ物は何ですか？'),
    ('c1000000-0000-0000-0000-000000000002', 'Japanese', 'どこから来ましたか？'),
    ('c1000000-0000-0000-0000-000000000003', 'Japanese', '暇な時は何をしますか？'),
    ('c1000000-0000-0000-0000-000000000004', 'Japanese', '典型的な一日を説明できますか？'),
    ('c1000000-0000-0000-0000-000000000005', 'Japanese', 'あなたの好きな趣味は何ですか？'),
    ('c1000000-0000-0000-0000-000000000006', 'Japanese', '週末は何をするのが好きですか？'),
    ('c1000000-0000-0000-0000-000000000007', 'Japanese', 'あなたの故郷をどう説明しますか？'),
    ('c1000000-0000-0000-0000-000000000008', 'Japanese', 'あなたの名前は何ですか？'),
    ('c1000000-0000-0000-0000-000000000009', 'Japanese', '週末は何をしますか？'),
    ('c1000000-0000-0000-0000-000000000010', 'Japanese', 'あなたの国の文化について教えてください。'),
    ('c1000000-0000-0000-0000-000000000011', 'Japanese', 'あなたの世代が前の世代と比べて直面している主な課題は何ですか？'),
    ('c1000000-0000-0000-0000-000000000012', 'Japanese', 'テクノロジーは人々の関係の築き方をどのように変えたと思いますか？'),
    ('c1000000-0000-0000-0000-000000000013', 'Japanese', '言語の多様性は国際協力にどの程度貢献している、あるいは妨げていると思いますか？'),
    ('c1000000-0000-0000-0000-000000000014', 'Japanese', '経済成長は本質的に環境の持続可能性と相反するという主張をどのように批評しますか？');