CREATE TYPE status AS ENUM('public', 'private', 'cheater');
ALTER TABLE players ADD status status DEFAULT 'public';
ALTER TABLE players ADD api_key VARCHAR;
ALTER TABLE players ADD rcode_check_code VARCHAR;