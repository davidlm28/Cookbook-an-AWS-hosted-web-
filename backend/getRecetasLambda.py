import json
import os
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME'))

def lambda_handler(event, context):
    print(f"Received event for getRecipes: {json.dumps(event)}")
    headers = {
        'Access-Control-Allow-Origin': '*', # Permitir cualquier origen
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,GET,DELETE' # Todos los métodos que tu API soporta
    }
    try:
        recipe_id = None
        # pathParameters puede ser None si no hay parámetros en la ruta (e.g., /recipes)
        if event.get('pathParameters') and 'idReceta' in event['pathParameters']:
            recipe_id = event['pathParameters']['idReceta']

        if recipe_id:
            # Obtener una sola receta
            response = table.get_item(Key={'idReceta': recipe_id})
            item = response.get('Item')
            if not item:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'message': 'Receta no encontrada'})
                }
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(item)
            }
        else:
            # Obtener todas las recetas
            response = table.scan() # Scan es costoso para tablas grandes. Para producción, usar paginación o Query.
            items = response.get('Items', [])
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(items)
            }
    except Exception as e:
        print(f"Error getting recipes: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'message': f'Failed to retrieve recipes. Error: {str(e)}'})
        }
