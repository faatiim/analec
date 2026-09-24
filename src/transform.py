from pathlib import Path
import duckdb

DOSSIER_SQL = Path("sql")
BASE = "data/warehouse/electricite.duckdb"


def main():
    con = duckdb.connect(BASE)
    # Exécute les fichiers SQL dans l'ordre de leur numéro (01_, 02_...)
    for fichier in sorted(DOSSIER_SQL.glob("*.sql")):
        print(f"Exécution de {fichier.name}...")
        con.execute(fichier.read_text(encoding="utf-8"))
    con.close()
    print("Transformations terminées.")


if __name__ == "__main__":
    main()