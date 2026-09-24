# 2022

import duckdb

# con = duckdb.connect("data/warehouse/electricite.duckdb", read_only=True)

# print(con.sql("""
#     SELECT f.rang_acces, p.nom_pays, f.acces_total, f.acces_urbain,
#            f.acces_rural, f.ecart_urbain_rural, f.pop_sans_electricite
#     FROM marts.fct_electricite f
#     JOIN marts.dim_pays p USING (code_pays)
#     WHERE f.annee = 2022
#     ORDER BY f.rang_acces
# """))

# con.close()

# import duckdb

con = duckdb.connect("data/warehouse/electricite.duckdb", read_only=True)

# .df() convertit en tableau pandas ; to_string() affiche toutes les colonnes
resultat = con.sql("""
    SELECT f.rang_acces, p.nom_pays, f.acces_total, f.acces_urbain,
           f.acces_rural, f.ecart_urbain_rural, f.pop_sans_electricite
    FROM marts.fct_electricite f
    JOIN marts.dim_pays p USING (code_pays)
    WHERE f.annee = 2022
    ORDER BY f.rang_acces
""").df()

print(resultat.to_string(index=False))
con.close()
# GLOBAL

# import duckdb

# con = duckdb.connect("data/warehouse/electricite.duckdb", read_only=True)

# # Les 5 dernières années pour le Sénégal, directement depuis la table brute
# print(con.sql("""
#     SELECT countryiso3code, date, value
#     FROM raw.acces_total
#     WHERE countryiso3code = 'SEN'
#     ORDER BY date DESC
#     LIMIT 5
# """))

# con.close()

