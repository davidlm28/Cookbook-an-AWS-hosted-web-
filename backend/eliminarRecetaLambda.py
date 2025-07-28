import json
import os
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME'))

def lambda_handler(event, context):
    print(f"Received event for deleteRecipe: {json.dumps(event)}")

    try:
        recipe_id = None
        if event.get('pathParameters') and 'idReceta' in event['pathParameters']:
            recipe_id = event['pathParameters']['idReceta']

        if not recipe_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Missing idReceta in path.'})
            }

        table.delete_item(Key={'idReceta': recipe_id})

        return {
            'statusCode': 204, # No Content: la solicitud se ha completado pero no hay contenido que devolver
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': ''
        }

    except Exception as e:
        print(f"Error deleting recipe: {e}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': f'Failed to delete recipe. Error: {str(e)}'})
        }
