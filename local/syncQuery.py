#!/usr/bin/python
# _*_ coding: utf-8 _*_

import requests
import json
import os
import re
#from googleapiclient.discovery import build
import sys
#by Nakamura Takanosuke
# カスタム検索エンジンID
CUSTOM_SEARCH_ENGINE_ID = "e2359e2d32cb64ae4"
# API キー
CSE_API_KEY = "AIzaSyAhhTVfkUdq4dv1sGQ-aSwaIQLOMefkXxk"
SEARCHNUMBER=4
DOMAIN = "61ze192i3cf0"
SEND_URL = "https://" + DOMAIN + ".cybozu.com/k/v1/"
GET_URL = "https://" + DOMAIN + ".cybozu.com/k/v1/records.json?app=1"
GET_URL_1 = "https://" + DOMAIN + ".cybozu.com/k/v1/record.json?app=1&id="
DEL_URL = "https://" + DOMAIN + ".cybozu.com/k/v1/records.json?app=1&ids="
APPID = 1
API_TOKEN = "RKicFVgZXWTU0v3kRMjIYahz3sJOD1icF0AZLFul"

"""質問を一つ登録"""


def send_question(url, api_token, question, number, title):
  PARAMS = {
      "app": APPID,
      "record": {
          "question": {
              "value": question
          },
          "number": {
              "value": number
          },
          "title": {
              "value": title
          }
      }
  }
  headers = {
      "X-Cybozu-API-Token": api_token,
      "Content-Type": "application/json"
  }
  resp = requests.post(url + "record.json", json=PARAMS, headers=headers)
  return resp


"""質問の全件取得"""


def get_questions(url, api_token):
  headers = {"X-Cybozu-API-Token": api_token}
  resp = requests.get(url, headers=headers)
  return resp


"""質問の一件取得"""


def get_one_question(url, api_token, number):
  headers = {"X-Cybozu-API-Token": api_token}
  resp = requests.get(url + number, headers=headers)
  return resp


"""質問の削除"""


def del_question(url, api_token, id):
  headers = {"X-Cybozu-API-Token": api_token}
  resp = requests.delete(url + id, headers=headers)
  return resp


"""google検索"""


def get_search_results(query):
# APIでやりとりするためのリソースを構築
 search = build(
     "customsearch", 
     "v1", 
     developerKey = CSE_API_KEY
 )
# Google Custom Search から結果を取得
 result = search.cse().list(
     q = query,
     cx = CUSTOM_SEARCH_ENGINE_ID,
     lr = 'lang_ja',
     num = SEARCHNUMBER,
     start = 1
 ).execute()
# 受け取ったjsonをそのまま返却
 return result


"""google検索結果分解"""


def summarize_search_results(result):
 result_items_part = result['items']
 result_items = []
 for i in range(0, SEARCHNUMBER):
     result_item = result_items_part[i]
     result_items.append(
         SearchResult(
             title = result_item['title'],
             url = result_item['link']
         )
     )
 return result_items
  
"""表示形式設定"""

class SearchResult:
   def __init__(self, title, url):
       self.title = title
       self.url = url

   def __str__(self):
       return self.title+","+self.url


if __name__ == "__main__":
  setting = sys.argv[1]
  title = sys.argv[2]
  question = sys.argv[3]
  number = sys.argv[4]
  #query=sys.argv[5]
  if setting == '1':
    titles = []
    questions = []
    dates = []
    numbers = []
    RESP = get_questions(GET_URL, API_TOKEN)
    jsonResp = RESP.json()
    for jsonObj in jsonResp["records"]:
      titles.append(jsonObj["title"]["value"])
      questions.append(jsonObj["question"]["value"])
      dates.append(jsonObj["date"]["value"])
      numbers.append(jsonObj["number"]["value"])
    allData = {
        "title": titles,
        "question": questions,
        "date": dates,
        "number": numbers
    }
    print(json.dumps(allData, ensure_ascii=False, indent=2))
  elif setting == '2':
    RESP = get_questions(GET_URL, API_TOKEN)
    jsonResp = RESP.json()
    numbers = []
    count = 0
    number_now = 0
    for jsonObj in jsonResp["records"]:
      numbers.append(jsonObj["number"]["value"])
      count += 1
    for i in range(count):
      if False == i in numbers:
        number_now = i
        break
      number_now = i
      RESP = send_question(SEND_URL, API_TOKEN, question, number_now, title)
    print(number_now)

  elif setting == '3':
    id = 0
    RESP = get_questions(GET_URL, API_TOKEN)
    jsonResp = RESP.json()
    for jsonObj in jsonResp["records"]:
      if number == jsonObj["number"]["value"]:
        id = jsonObj["レコード番号"]["value"]
        print(id)
    RESP = del_question(DEL_URL, API_TOKEN, id)
    print(RESP)
  #elif setting=='4':
     #result = get_search_results(query) 
    #result_items_list = #summarize_search_results(result) 
     #for i in range(0, SEARCHNUMBER):
       #print(result_items_list[i])
