from pathlib import Path
import duckdb

BASE = "data/warehouse/electricite.duckdb"
DOSSIER_EXPORT = Path("data/export")
TABLES = ["marts.dim_pays", "marts.fct_electricite"]


def main():
    DOSSIER_EXPORT.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(BASE, read_only=True)
    # Une table finale = un fichier Parquet que Power BI lira directement
    for table in TABLES:
        fichier = DOSSIER_EXPORT / f"{table.split('.')[1]}.parquet"
        con.execute(f"COPY {table} TO '{fichier.as_posix()}' (FORMAT PARQUET)")
        print(f"{table} -> {fichier}")
    con.close()


if __name__ == "__main__":
    main()