--
-- PostgreSQL database dump
--

\restrict L6gdsX9NpdHr6mkwMhOq0GOJev6ZzTw6CpQeYjpIbD2bKghMLskcg8IpDagzAfE

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    game_id character varying(20) DEFAULT ('G'::text || (floor((random() * ('9223372036854775807'::bigint)::double precision)))::text) NOT NULL,
    mode character varying(20) NOT NULL,
    owner_id character varying(20) NOT NULL,
    owner_type character varying(10) NOT NULL,
    owner_color character varying(10) NOT NULL,
    opponent_id character varying(20),
    opponent_type character varying(10),
    opponent_color character varying(10),
    join_code character varying(8),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean NOT NULL,
    is_test boolean NOT NULL,
    CONSTRAINT check_computer_opponent CHECK ((((mode)::text <> 'computer'::text) OR ((opponent_type)::text = 'computer'::text))),
    CONSTRAINT check_friend_game_has_join_code CHECK ((((mode)::text <> 'friend'::text) OR (join_code IS NOT NULL))),
    CONSTRAINT games_mode_check CHECK (((mode)::text = ANY ((ARRAY['computer'::character varying, 'friend'::character varying])::text[]))),
    CONSTRAINT games_opponent_color_check CHECK (((opponent_color)::text = ANY ((ARRAY['white'::character varying, 'black'::character varying])::text[]))),
    CONSTRAINT games_opponent_type_check CHECK (((opponent_type)::text = ANY ((ARRAY['user'::character varying, 'guest'::character varying, 'computer'::character varying])::text[]))),
    CONSTRAINT games_owner_color_check CHECK (((owner_color)::text = ANY ((ARRAY['white'::character varying, 'black'::character varying, 'random'::character varying])::text[]))),
    CONSTRAINT games_owner_type_check CHECK (((owner_type)::text = ANY ((ARRAY['user'::character varying, 'guest'::character varying])::text[])))
);


--
-- Name: guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guests (
    guest_id character varying(20) DEFAULT ('T'::text || (floor((random() * ('9223372036854775807'::bigint)::double precision)))::text) NOT NULL,
    session_id character varying(255) NOT NULL,
    upgraded_to character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean NOT NULL,
    is_test boolean NOT NULL
);


--
-- Name: moves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.moves (
    game_id character varying(20) NOT NULL,
    move_number integer NOT NULL,
    player_color character varying(5) NOT NULL,
    move_san character varying(10) NOT NULL,
    move_from character varying(2) NOT NULL,
    move_to character varying(2) NOT NULL,
    fen_after text NOT NULL,
    time_taken_ms integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean NOT NULL,
    is_test boolean NOT NULL,
    CONSTRAINT moves_player_color_check CHECK (((player_color)::text = ANY ((ARRAY['white'::character varying, 'black'::character varying])::text[])))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id character varying(20) DEFAULT ('U'::text || (floor((random() * ('9223372036854775807'::bigint)::double precision)))::text) NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255),
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean NOT NULL,
    is_test boolean NOT NULL,
    CONSTRAINT email_format CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT username_min_length CHECK ((char_length((username)::text) >= 3))
);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: games games_join_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_join_code_key UNIQUE (join_code);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (game_id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (guest_id);


--
-- Name: guests guests_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_session_id_key UNIQUE (session_id);


--
-- Name: moves moves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moves
    ADD CONSTRAINT moves_pkey PRIMARY KEY (game_id, move_number);


--
-- Name: schema_migrations schema_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_games_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_is_deleted ON public.games USING btree (is_deleted);


--
-- Name: idx_games_is_test; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_is_test ON public.games USING btree (is_test) WHERE (is_test = true);


--
-- Name: idx_games_join_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_join_code ON public.games USING btree (join_code) WHERE (join_code IS NOT NULL);


--
-- Name: idx_games_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_metadata ON public.games USING gin (metadata);


--
-- Name: idx_games_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_mode ON public.games USING btree (mode);


--
-- Name: idx_games_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_owner_id ON public.games USING btree (owner_id);


--
-- Name: idx_games_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_user_active ON public.games USING btree (owner_id) WHERE ((opponent_id IS NOT NULL) AND (is_deleted = false));


--
-- Name: idx_games_waiting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_games_waiting ON public.games USING btree (mode, join_code) WHERE (opponent_id IS NULL);


--
-- Name: idx_guests_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guests_is_deleted ON public.guests USING btree (is_deleted);


--
-- Name: idx_guests_is_test; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guests_is_test ON public.guests USING btree (is_test) WHERE (is_test = true);


--
-- Name: idx_guests_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guests_session_id ON public.guests USING btree (session_id);


--
-- Name: idx_guests_upgraded_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guests_upgraded_to ON public.guests USING btree (upgraded_to);


--
-- Name: idx_moves_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moves_created_at ON public.moves USING btree (created_at);


--
-- Name: idx_moves_game_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moves_game_id ON public.moves USING btree (game_id);


--
-- Name: idx_moves_game_move_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moves_game_move_number ON public.moves USING btree (game_id, move_number);


--
-- Name: idx_moves_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moves_is_deleted ON public.moves USING btree (is_deleted);


--
-- Name: idx_moves_is_test; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moves_is_test ON public.moves USING btree (is_test) WHERE (is_test = true);


--
-- Name: idx_moves_player_color; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_moves_player_color ON public.moves USING btree (player_color);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_deleted ON public.users USING btree (is_deleted);


--
-- Name: idx_users_is_test; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_test ON public.users USING btree (is_test) WHERE (is_test = true);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: guests guests_upgraded_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_upgraded_to_fkey FOREIGN KEY (upgraded_to) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: moves moves_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.moves
    ADD CONSTRAINT moves_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(game_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict L6gdsX9NpdHr6mkwMhOq0GOJev6ZzTw6CpQeYjpIbD2bKghMLskcg8IpDagzAfE

