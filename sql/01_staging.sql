-- Réunit les 4 tables brutes en une seule table "longue" et propre
CREATE SCHEMA IF NOT EXISTS staging;

CREATE OR REPLACE TABLE staging.stg_indicateurs AS
SELECT countryiso3code AS code_pays, country.value AS nom_pays,
       CAST(date AS INTEGER) AS annee, 'acces_total' AS indicateur, value AS valeur
FROM raw.acces_total
UNION ALL
SELECT countryiso3code, country.value, CAST(date AS INTEGER), 'acces_urbain', value
FROM raw.acces_urbain
UNION ALL
SELECT countryiso3code, country.value, CAST(date AS INTEGER), 'acces_rural', value
FROM raw.acces_rural
UNION ALL
SELECT countryiso3code, country.value, CAST(date AS INTEGER), 'population', value
FROM raw.population;