import json
import time
from pathlib import Path
import requests

PAYS = ["SEN", "CIV", "MLI", "GIN", "MRT", "GMB", "BFA", "GHA"]

INDICATEURS = {
    "EG.ELC.ACCS.ZS": "acces_total",
    "EG.ELC.ACCS.UR.ZS": "acces_urbain",
    "EG.ELC.ACCS.RU.ZS": "acces_rural",
    "SP.POP.TOTL": "population",
}

DOSSIER_RAW = Path("data/raw/worldbank")


def extraire(indicateur, tentatives=3):
    # L'API de la Banque mondiale est parfois lente : on réessaie avant d'abandonner
    url = f"https://api.worldbank.org/v2/country/{';'.join(PAYS)}/indicator/{indicateur}"
    params = {"format": "json", "per_page": 20000, "date": "2000:2024"}
    for essai in range(1, tentatives + 1):
        try:
            reponse = requests.get(url, params=params, timeout=(10, 90))
            reponse.raise_for_status()
            metadata, donnees = reponse.json()
            return donnees
        except requests.exceptions.RequestException as erreur:
            print(f"  Essai {essai}/{tentatives} échoué : {type(erreur).__name__}")
            if essai == tentatives:
                raise              # 3 échecs : on arrête avec l'erreur
            time.sleep(5 * essai)  # attend 5 s, puis 10 s


def main():
    DOSSIER_RAW.mkdir(parents=True, exist_ok=True)
    for code, nom in INDICATEURS.items():
        fichier = DOSSIER_RAW / f"{nom}.json"
        # Évite de retélécharger ce qu'on a déjà (utile quand on relance après une panne)
        if fichier.exists():
            print(f"{nom} : déjà téléchargé, on passe")
            continue
        donnees = extraire(code)
        fichier.write_text(json.dumps(donnees, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{nom} : {len(donnees)} lignes -> {fichier}")


if __name__ == "__main__":
    main()



# import json
# from pathlib import Path
# import requests

# # Pays comparés (codes ISO3)
# PAYS = ["SEN", "CIV", "MLI", "GIN", "MRT", "GMB", "BFA", "GHA"]

# # Code Banque mondiale -> nom lisible
# INDICATEURS = {
#     "EG.ELC.ACCS.ZS": "acces_total",
#     "EG.ELC.ACCS.UR.ZS": "acces_urbain",
#     "EG.ELC.ACCS.RU.ZS": "acces_rural",
#     "SP.POP.TOTL": "population",
# }

# DOSSIER_RAW = Path("data/raw/worldbank")


# def extraire(indicateur):
#     url = f"https://api.worldbank.org/v2/country/{';'.join(PAYS)}/indicator/{indicateur}"
#     params = {"format": "json", "per_page": 20000, "date": "2000:2024"}
#     reponse = requests.get(url, params=params, timeout=30)
#     reponse.raise_for_status()          # stoppe si erreur HTTP (404, 500...)
#     metadata, donnees = reponse.json()  # l'API renvoie [infos, données]
#     return donnees


# def main():
#     DOSSIER_RAW.mkdir(parents=True, exist_ok=True)
#     for code, nom in INDICATEURS.items():
#         donnees = extraire(code)
#         fichier = DOSSIER_RAW / f"{nom}.json"
#         fichier.write_text(json.dumps(donnees, ensure_ascii=False, indent=2), encoding="utf-8")
#         print(f"{nom} : {len(donnees)} lignes -> {fichier}")


# if __name__ == "__main__":
#     main()