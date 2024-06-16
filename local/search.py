import requests
import sys

def bing_search(query, api_key, count=10):
    # Bing Search APIエンドポイント
    endpoint = "https://api.bing.microsoft.com/v7.0/search"
    
    # ヘッダーにAPIキーを設定
    headers = {"Ocp-Apim-Subscription-Key": api_key}
    
    # クエリパラメータを設定
    params = {
        "q": query,
        "count": count,
        "responseFilter": "Webpages",
        "mkt": "ja-JP"
    }
    
    # APIリクエストを送信
    response = requests.get(endpoint, headers=headers, params=params)
    
    # レスポンスのステータスコードをチェック
    if response.status_code == 200:
        # JSON形式のレスポンスを取得
        results = response.json()
        return results
    else:
        # エラーメッセージを表示
        raise Exception(f"Error: {response.status_code}, {response.text}")

def main(query):
    # APIキーを設定
    api_key = "872bc9bbe93c4874b0e3b450b23861fa"

    # 検索クエリを設定
    # 検索を実行
    try:
        search_results = bing_search(query, api_key)
        # 結果を表示
        for i, web_page in enumerate(search_results["webPages"]["value"]):
            print(f"Name: {web_page['name']}")
            print(f"URL: {web_page['url']}\n")
            if i == 2:
                break
    except Exception as e:
        print(e)

if __name__ == "__main__":
    args = sys.argv
    main(args[1])