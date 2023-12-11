import pandas as pd
from tqdm import tqdm
import re
from nltk.corpus import stopwords
import nltk
#get the english and chinese stopwords from nltk


nltk.download('stopwords')
stop_words = set(stopwords.words('english'))
stop_words.add("nan")
stop_words.add("remix")
stop_words.add("feat")  
# ada a to z to stopword
for i in range(97,123):
    stop_words.add(chr(i)) 
print(stop_words)

class dataset():
    def __init__(self,file_name):
        self.name = file_name
        self.original_data = self.load_data()
        self.preproc_data = None
        #不知道為什麼這樣不行 self.preproc_data = self.preproc()
        self.preproc()
    def load_data(self):
        try:
            print("開始讀取數據...")
            tqdm.pandas()
            # 讀取CSV檔案，並使用tqdm顯示進度條
            df = pd.read_csv(self.name, chunksize=1000)  # 這裡的chunksize可以根據需要調整
            total_rows = sum(1 for _ in df)  # 獲取總行數
            df = pd.read_csv(self.name, iterator=True, chunksize=1000)
            # 使用tqdm.pandas()設定之後，可以直接在progress_apply中使用tqdm_pandas函數
            original = pd.concat(tqdm(df, total=total_rows // 1000), axis=0)
            print("數據讀取完成。")
            return original
        except Exception as e:
            print(f"Error loading data: {e}")

    def preproc(self):
            try:
                print("開始文字預處理...")
                
                # 在原始資料副本上新增一個新的欄位 preproc_description
                self.preproc_data = self.original_data.copy()
                # print(self.preproc_data['track_name'])
                self.preproc_data['preproc_track_name'] = self.preproc_data['track_name'].apply(clean_text)
                self.preproc_data['preproc_track_name'] = self.preproc_data['preproc_track_name'] .apply(remove_stopwords)
                print("文字預處理完成。")
                print("Original data:")
                print(self.original_data['track_name'].head(1))
                print("\nPreprocessed data:")
                print(self.preproc_data['preproc_track_name'].head(1))


            except Exception as e:
                print(f"Error during preprocessing: {e}")

    def save_result(self,file_name):
        try:
            if self.preproc_data is not None:
                print(f"Saving processed data to {file_name}...")
                self.preproc_data.to_csv(file_name, index=False)
                print("Processed data saved successfully.")
            else:
                print("No processed data available. Please run the 'preproc' method first.")
        except Exception as e:
            print(f"Error saving data: {e}")

def clean_text(text):
    text = str(text)
    for char in text:
        if '\u4e00' <= char <= '\u9fff':
            return text
    # remove backslash-apostrophe 
    text = re.sub("\'", " ", text) 
    # remove everything except alphabets 
    text = re.sub("[^a-zA-Z]"," ",text) 
    # remove whitespaces 
    text = ' '.join(text.split()) 
    # convert text to lowercase 
    text = text.lower() 
    
    return text 
def remove_stopwords(text):
    no_stopword_text = [w for w in text.split() if not w in stop_words]
    return ' '.join(no_stopword_text)

test_data = dataset("dataset.csv")
# print(test_data.original_data)
test_data.save_result("preprocessed_data.csv")