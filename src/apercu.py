import duckdb

con = duckdb.connect("data/warehouse/electricite.duckdb", read_only=True)

# Les 5 dernières années pour le Sénégal, directement depuis la table brute
print(con.sql("""
    SELECT countryiso3code, date, value
    FROM raw.acces_total
    WHERE countryiso3code = 'SEN'
    ORDER BY date DESC
    LIMIT 5
"""))

con.close()