-- Tables finales pour Power BI
CREATE SCHEMA IF NOT EXISTS marts;

-- -- Dimension : un pays par ligne
-- CREATE OR REPLACE TABLE marts.dim_pays AS
-- SELECT DISTINCT code_pays, nom_pays, code_pays = 'SEN' AS est_senegal
-- FROM staging.stg_indicateurs;

-- Dimension : un pays par ligne, avec le nom en français
CREATE OR REPLACE TABLE marts.dim_pays AS
SELECT DISTINCT code_pays,
       CASE code_pays
           WHEN 'SEN' THEN 'Sénégal'
           WHEN 'CIV' THEN 'Côte d''Ivoire'
           WHEN 'MLI' THEN 'Mali'
           WHEN 'GIN' THEN 'Guinée'
           WHEN 'MRT' THEN 'Mauritanie'
           WHEN 'GMB' THEN 'Gambie'
           WHEN 'BFA' THEN 'Burkina Faso'
           WHEN 'GHA' THEN 'Ghana'
           ELSE nom_pays
       END AS nom_pays,
       code_pays = 'SEN' AS est_senegal
FROM staging.stg_indicateurs;

-- Faits : une ligne par pays et par année, avec les calculs métier
CREATE OR REPLACE TABLE marts.fct_electricite AS
WITH indicateurs_par_annee AS (
    SELECT code_pays, annee,
           MAX(CASE WHEN indicateur = 'acces_total'  THEN valeur END) AS acces_total,
           MAX(CASE WHEN indicateur = 'acces_urbain' THEN valeur END) AS acces_urbain,
           MAX(CASE WHEN indicateur = 'acces_rural'  THEN valeur END) AS acces_rural,
           MAX(CASE WHEN indicateur = 'population'   THEN valeur END) AS population
    FROM staging.stg_indicateurs
    GROUP BY code_pays, annee
)
SELECT *,
       ROUND(acces_urbain - acces_rural, 1) AS ecart_urbain_rural,
       CAST(population * (100 - acces_total) / 100 AS BIGINT) AS pop_sans_electricite,
       CASE WHEN acces_total IS NOT NULL
            THEN RANK() OVER (PARTITION BY annee ORDER BY acces_total DESC NULLS LAST)
       END AS rang_acces
FROM indicateurs_par_annee;


