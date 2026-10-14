-- Schéma PostgreSQL de Green System. Idempotent : peut être rejoué à chaque démarrage.
-- Rôles : administrateur | gestionnaire | agent | client (validés par l'application).
CREATE TABLE IF NOT EXISTS users (
  matricule      text PRIMARY KEY,         -- matricule (personnel) ou e-mail (clients)
  salt           text NOT NULL,
  hash           text NOT NULL,
  role           text NOT NULL,
  cooperative_id text,
  name           text,
  active         boolean NOT NULL DEFAULT true,
  approved       boolean NOT NULL DEFAULT false,  -- clients : agrément délivré par l'administration
  company        text
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_email boolean NOT NULL DEFAULT false;  -- rappels par e-mail : choix de l'utilisateur
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_sms boolean NOT NULL DEFAULT false;    -- rappels par SMS : choix de l'utilisateur

CREATE TABLE IF NOT EXISTS records (
  collection     text    NOT NULL,
  id             text    NOT NULL,
  data           jsonb   NOT NULL,
  cooperative_id text,
  updated_at     bigint  NOT NULL,   -- horloge de l'appareil (résolution des conflits)
  server_at      bigint  NOT NULL,   -- horloge du serveur (curseur de synchronisation)
  deleted        boolean NOT NULL DEFAULT false,
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS records_server_at_idx ON records (server_at);
CREATE INDEX IF NOT EXISTS records_coop_idx ON records (cooperative_id, collection);
