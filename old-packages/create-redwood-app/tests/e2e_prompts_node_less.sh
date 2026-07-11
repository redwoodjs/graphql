#!/usr/bin/expect

# You have to set your Node version to 18 before running this one.

set projectPath $env(PROJECT_PATH)

if {$projectPath eq ""} {
    puts "PROJECT_PATH is not set"
    exit
}

cd $projectPath

set projectDirectory "redwood-app-prompt-node-less-test"

spawn yarn create-redwood-app --no-yarn-install

expect eof
catch wait result
set exitStatus [lindex $result 3]

if {$exitStatus == 1} {
    puts "Success"
    exec rm -rf $projectDirectory
    exit 0
} else {
    puts "Error: The process didn't fail with exit status $exitStatus"
    exec rm -rf $projectDirectory
    exit 1
}
