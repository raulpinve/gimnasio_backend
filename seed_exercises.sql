-- Seed de ejercicios básicos
-- Ejecutar con: psql -d fitness -f seed_exercises.sql
--
-- Los IDs son fijos (terminan en 01, 02, ...) para poder referenciarlos
-- en los JSON de pruebas sin tener que consultarlos. Se puede ejecutar varias
-- veces: si el ejercicio ya existe, se omite.

INSERT INTO exercises (id, name, type, muscle_groups, equipment, description) VALUES

-- ===== MÁQUINAS =====
('00000000-0000-4000-8000-000000000001', 'Prensa de piernas', 'strength',
 ARRAY['cuadriceps','gluteos','isquios'], 'maquinas',
 'Sentado con la espalda apoyada y los pies al ancho de los hombros en la plataforma | Baja las rodillas hacia el pecho de forma controlada y empuja sin bloquear las rodillas al subir'),

('00000000-0000-4000-8000-000000000002', 'Press de pecho en máquina', 'strength',
 ARRAY['pecho','triceps','hombros'], 'maquinas',
 'Sentado con la espalda pegada al respaldo y los agarres a la altura del pecho | Empuja hacia delante hasta estirar los brazos sin bloquear los codos y regresa lento'),

('00000000-0000-4000-8000-000000000003', 'Remo en máquina', 'strength',
 ARRAY['espalda','biceps'], 'maquinas',
 'Sentado con el pecho apoyado en el soporte y los brazos estirados al frente | Lleva los codos hacia atrás juntando los omóplatos y regresa de forma controlada'),

('00000000-0000-4000-8000-000000000004', 'Jalón al pecho en máquina', 'strength',
 ARRAY['espalda','biceps'], 'maquinas',
 'Sentado con los muslos fijos bajo el soporte y agarre un poco más ancho que los hombros | Baja la barra hasta la parte alta del pecho llevando los codos hacia abajo y sube lento'),

('00000000-0000-4000-8000-000000000008', 'Curl femoral en máquina', 'strength',
 ARRAY['isquios'], 'maquinas',
 'Sentado o acostado con el rodillo sobre la parte baja de las piernas | Flexiona las rodillas llevando el rodillo hacia los glúteos y regresa despacio'),

('00000000-0000-4000-8000-000000000009', 'Extensión de cuádriceps en máquina', 'strength',
 ARRAY['cuadriceps'], 'maquinas',
 'Sentado con la espalda apoyada y el rodillo sobre los tobillos | Estira las rodillas hasta levantar las piernas y baja de forma controlada'),

('00000000-0000-4000-8000-000000000014', 'Elevación de talones en máquina', 'strength',
 ARRAY['gemelos'], 'maquinas',
 'De pie o sentado con la punta de los pies en el borde de la plataforma | Sube lo más alto posible sobre las puntas, pausa un segundo y baja estirando bien'),

-- ===== MANCUERNAS =====
('00000000-0000-4000-8000-000000000005', 'Press de hombros con mancuernas', 'strength',
 ARRAY['hombros','triceps'], 'mancuernas',
 'Sentado con la espalda recta y las mancuernas a la altura de los hombros | Empuja hacia arriba hasta estirar los brazos y baja de forma controlada'),

('00000000-0000-4000-8000-000000000006', 'Curl de bíceps con mancuernas', 'strength',
 ARRAY['biceps','antebrazos'], 'mancuernas',
 'De pie con una mancuerna en cada mano y los codos pegados al torso | Flexiona los codos subiendo las mancuernas sin balancear el cuerpo y baja lento'),

('00000000-0000-4000-8000-000000000007', 'Extensión de tríceps con mancuerna', 'strength',
 ARRAY['triceps'], 'mancuernas',
 'De pie o sentado sosteniendo una mancuerna con ambas manos por encima de la cabeza | Baja la mancuerna detrás de la cabeza doblando los codos y estira de nuevo'),

('00000000-0000-4000-8000-000000000010', 'Sentadilla goblet', 'strength',
 ARRAY['cuadriceps','gluteos','abs'], 'mancuernas',
 'De pie con los pies al ancho de los hombros y una mancuerna sujeta contra el pecho | Baja como si te sentaras manteniendo el pecho arriba y sube empujando con los talones'),

('00000000-0000-4000-8000-000000000011', 'Peso muerto rumano con mancuernas', 'strength',
 ARRAY['isquios','gluteos','lumbares'], 'mancuernas',
 'De pie con una mancuerna en cada mano frente a los muslos y las rodillas ligeramente flexionadas | Lleva la cadera hacia atrás bajando las mancuernas pegadas a las piernas y sube con la espalda recta'),

('00000000-0000-4000-8000-000000000012', 'Press inclinado con mancuernas', 'strength',
 ARRAY['pecho','hombros','triceps'], 'mancuernas',
 'Acostado en un banco inclinado con las mancuernas a los lados del pecho | Empuja hacia arriba juntando ligeramente las mancuernas y baja de forma controlada'),

('00000000-0000-4000-8000-000000000013', 'Elevaciones laterales con mancuernas', 'strength',
 ARRAY['hombros'], 'mancuernas',
 'De pie con una mancuerna en cada mano a los lados del cuerpo y los codos ligeramente flexionados | Eleva los brazos hacia los lados hasta la altura de los hombros y baja lento'),

-- ===== PESO CORPORAL =====
('00000000-0000-4000-8000-000000000015', 'Plancha', 'strength',
 ARRAY['abs'], 'peso_corporal',
 'Apoyado sobre los antebrazos y las puntas de los pies con el cuerpo en línea recta | Mantén la posición apretando abdomen y glúteos sin dejar caer la cadera'),

('00000000-0000-4000-8000-000000000016', 'Crunch abdominal', 'strength',
 ARRAY['abs'], 'peso_corporal',
 'Acostado boca arriba con las rodillas flexionadas y los pies en el suelo | Eleva los hombros del suelo contrayendo el abdomen y baja de forma controlada'),

('00000000-0000-4000-8000-000000000017', 'Puente de glúteos', 'strength',
 ARRAY['gluteos','isquios'], 'peso_corporal',
 'Acostado boca arriba con las rodillas flexionadas y los pies cerca de los glúteos | Eleva la cadera apretando los glúteos hasta alinear hombros, cadera y rodillas, y baja lento'),

('00000000-0000-4000-8000-000000000018', 'Flexiones', 'strength',
 ARRAY['pecho','triceps','hombros'], 'peso_corporal',
 'Manos apoyadas un poco más anchas que los hombros y el cuerpo en línea recta | Baja el pecho hacia el suelo doblando los codos y empuja para subir. Puedes apoyar las rodillas para hacerlo más fácil'),

-- ===== CARDIO =====
('00000000-0000-4000-8000-000000000019', 'Caminadora', 'cardio',
 ARRAY['cardio'], 'maquinas',
 'De pie sobre la banda con la espalda recta y la mirada al frente | Camina o trota a un ritmo constante que te permita mantener una conversación'),

('00000000-0000-4000-8000-000000000020', 'Bicicleta estática', 'cardio',
 ARRAY['cardio','cuadriceps'], 'maquinas',
 'Sentado con el asiento a la altura de la cadera y la espalda recta | Pedalea a ritmo constante ajustando la resistencia según tu nivel'),

('00000000-0000-4000-8000-000000000021', 'Elíptica', 'cardio',
 ARRAY['cardio'], 'maquinas',
 'De pie sobre los pedales con las manos en los agarres y la espalda recta | Mueve piernas y brazos de forma fluida a un ritmo constante, sin apoyarte en el manubrio')

ON CONFLICT (id) DO NOTHING;
