import json
import os
import boto3
import uuid

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME')) # Nombre de la tabla
sns = boto3.client('sns')

# Reemplaza con el ARN de tu tema SNS
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')

def lambda_handler(event, context):
    print(f"Received event from SQS: {json.dumps(event)}")

    for record in event['Records']:
        try:
            # Ahora el body contiene directamente los datos de la receta
            recipe_json_str = record.get('body', '{}')
            
            print(f"DEBUG processRecipeLambda: Raw recipe data: {recipe_json_str}")
            
            # Parse directamente los datos de la receta
            recipe_data_dict = json.loads(recipe_json_str)
            
            print(f"DEBUG processRecipeLambda: Parsed recipe data: {recipe_data_dict}")

            # Resto de tu lógica existente...
            operation_type = 'created'
            
            if 'idReceta' in recipe_data_dict and recipe_data_dict['idReceta']:
                operation_type = 'updated'
            else:
                recipe_data_dict['idReceta'] = str(uuid.uuid4())
                operation_type = 'created'

            # Validación y guardado en DynamoDB
            required_fields = ['Nombre', 'Ingredientes', 'Instrucciones']
            if not all(field in recipe_data_dict for field in required_fields):
                print(f"WARNING: Missing required fields in recipe data: {recipe_data_dict}")
                continue

            table.put_item(Item=recipe_data_dict)
            print(f"Recipe {recipe_data_dict['idReceta']} {operation_type} successfully.")

            # SNS notification
            sns_message = {
                "default": f"Recipe {recipe_data_dict.get('Nombre', 'Unnamed Recipe')} (ID: {recipe_data_dict['idReceta']}) was {operation_type}.",
                "email": f"Hello! A recipe \"{recipe_data_dict.get('Nombre', 'Unnamed Recipe')}\" (ID: {recipe_data_dict['idReceta']}) was {operation_type}.\n\nDetails: {json.dumps(recipe_data_dict, indent=2)}"
            }

            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Message=json.dumps(sns_message),
                MessageStructure='json',
                Subject=f"New Recipe {operation_type.upper()}: {recipe_data_dict.get('Nombre', 'Unnamed Recipe')}"
            )
            
        except json.JSONDecodeError as e:
            print(f"JSON Parsing Error: {e}. Record body: {record.get('body', 'N/A')}")
            continue
        except Exception as e:
            print(f"Error processing record: {e}")
            continue

    return {
        'statusCode': 200,
        'body': json.dumps('Processed SQS records successfully.')
    }