from pathlib import Path
import duckdb

DOSSIER_RAW = Path("data/raw/worldbank")
BASE = Path("data/warehouse/electricite.duckdb")


def main():
    BASE.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(BASE))  # crée le fichier .duckdb s'il n'existe pas

    # Schéma "raw" : les données brutes, jamais modifiées à la main
    con.execute("CREATE SCHEMA IF NOT EXISTS raw")

    # Un fichier JSON = une table brute (acces_total.json -> raw.acces_total)
    for fichier in sorted(DOSSIER_RAW.glob("*.json")):
        table = f"raw.{fichier.stem}"
        # CREATE OR REPLACE : on peut relancer le script sans créer de doublons
        con.execute(f"""
            CREATE OR REPLACE TABLE {table} AS
            SELECT *, current_timestamp AS _charge_le
            FROM read_json_auto('{fichier.as_posix()}')
        """)
        nb = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        print(f"{table} : {nb} lignes chargées")

    con.close()


if __name__ == "__main__":
    main()