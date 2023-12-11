import pandas as pd
def read_csv(file_name):
    df = pd.read_csv(file_name)
    data = df["preproc_track_name"]
    return data


def cal_freq(data):
    freq = {}
    for i in data:
        i = str(i)
        for j in i.split():
            if j not in freq:
                freq[j] = 1
            else:
                freq[j] += 1
    return freq
#{"text":"I","size":5896}
#copy the result dict to the txt.file

def write_freq_result(freq):
    with open("freq_result.txt","w") as f:
            f.write(freq)
preproced_data = read_csv("preprocessed_data.csv") 
result = cal_freq(preproced_data)
converted_list = [{"text": k, "size": v} for k, v in result.items() if v>100]

import json
with open('output.txt', 'w') as file:
    file.write(json.dumps(converted_list))
print(result)