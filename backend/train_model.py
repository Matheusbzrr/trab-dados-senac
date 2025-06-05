import pandas as pd
from pymongo import MongoClient
from xgboost import XGBClassifier
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import pickle

client = MongoClient("mongodb://localhost:27017/")
db = client["meu_banco"]
colecao = db["meus_dados"]

dados = list(colecao.find({}, {"_id": 0}))

lista = []
for d in dados:
    lista.append({
        "idade": d["vitima"]["idade"],
        "etnia": d["vitima"]["etnia"],
        "localizacao": d["localizacao"],
        "tipo_do_caso": d["tipo_do_caso"]
    })

df = pd.DataFrame(lista)

X = df[["idade", "etnia", "localizacao"]]
y = df["tipo_do_caso"]

label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

categorical_features = ["etnia", "localizacao"]
numeric_features = ["idade"]

preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown='ignore'), categorical_features),
        ("num", "passthrough", numeric_features)
    ]
)

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("classifier", XGBClassifier(use_label_encoder=False, eval_metric='mlogloss'))
])

pipeline.fit(X, y_encoded)

with open("model.pkl", "wb") as f:
    pickle.dump({
        "pipeline": pipeline,
        "label_encoder": label_encoder
    }, f)

print("Modelo treinado e salvo em model.pkl")